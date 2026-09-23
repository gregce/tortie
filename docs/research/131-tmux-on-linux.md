# 131. tmux on Linux: what each distribution ships, and whether Tortie's live connection opens on it

Phase 322. Written 2026-09-23 against the tree at `18bc1b61` ("docs(backlog): the detector's misses, tmux on Linux,
and End for Gemini, queued"). While the round ran, main moved to `3c371f24`: Phase 320's first slice landed at
`b28d0eb4`, and it gave `refresh-client -f no-output` its own reply slot in `src/main/tmux/control-client.ts`. No
line of either version gate, of Prepare or of the twelve boot options moved, so nothing below changes. Line numbers
are at `18bc1b61`.

**No Linux machine was reached and no Linux binary was run.** No ssh was run, no container or virtual machine was
started, nothing was installed, no Electron was started, and the operator's `-L gmux` server and his default tmux
server were never touched or read. `build/probe-control-dialect.mjs` reads his server, so it was not run; its steps
were copied into scratch. tmux was built on this Mac (arm64, Apple clang 17) from pinned upstream tarballs, with each
distribution's own patch set applied where it has one, and every server ran on its own `-L p322-*` socket. Every
far-side string was composed by Tortie's own functions through the repository's pinned tsx and run as
`/bin/sh -c <the composed far string>` under a scratch `HOME`, which is how research 130 replaced the ssh hop.
Package data (source packages, binary packages, spec files, build logs, update histories) was downloaded into scratch
and read as data. Ten Debian and Ubuntu binary packages were opened as archives and read as bytes, never executed.

**The round.** Investigator A read the package data, built every version and drove the shipping client over each.
Investigator B read the two gates, their callers, what a person reads, and the policy options, and measured what a
capability probe can and cannot see. One adversary took all three of the entry's adversary briefs (the stand-in, the
gate as shipped, the recommendation) and also answered the upgrade-pair question, because no third investigator ran.
A judge ruled on every disagreement and re-measured the claims nobody had measured end to end. The mechanism named
three investigators and three adversaries; the round ran fewer agents over the same five questions. The attack
happened before a word of this was written, and §6 records what it killed so no later round re-derives it. The
harnesses and raw results are under the session's scratchpad (`scratchpad/p322/{A,B,adv,judge}/`) and are not in the
tree.

This answers research 130 §10 question 2, "Measure the control connection on the tmux versions Linux distributions
ship?", which the operator answered yes on 2026-09-23. Issue 31's reporter, Jake Levirne, runs a Linux far machine
whose tmux version was never observed. Phase 320.1, which the operator approved, reaches only machines whose live
connection opens, and today that is three version strings, `3.6a`, `3.7b` and `3.7c`, each measured from a copy on a
Mac (`src/main/tmux/version.ts:171-237`).

## 1. The answer first

1. **Every long-term-support distribution except the newest fails Prepare, and accepting the version does not help.**
   Ubuntu 22.04 (tmux 3.2a), Ubuntu 24.04 (3.4), Debian 12 (3.3a, or 3.5a from backports) and Debian 13 (3.5a) each
   run a tmux that refuses one of Tortie's twelve boot options. Prepare sets them one at a time and stops at the
   first refusal (`src/main/machines/remote-server.ts:165-168`): at row 4, `allow-passthrough`, on 3.2a, and at row
   10, `copy-mode-position-format`, on 3.3a to 3.5a. Row 11, `mode-style noattr,bg=default,fg=default`, is refused
   too, because `noattr` became a style word in 3.6. The rows after the stop are never set, so `history-limit` stays
   at tmux's 2,000, and the server Prepare started stays up with `exit-empty off`. The person then reads "Tortie could
   not reach this machine, and it does not recognise the reason.", with a JSON blob as its detail, about a machine
   Tortie did reach. This has been true since the twelve rows landed in `4c86bea5` on 2026-08-17.
2. **Ubuntu 26.04 LTS reports `3.6`, not `3.6a`.** Its package is called `3.6a-2ubuntu0.1`, but its source is
   upstream tag 3.6, which a line in Debian's `debian/watch` relabelled by appending an `a`. Two methods on two
   architectures agree (§2.2). The entry's table was wrong: both gates refuse Ubuntu 26.04 today. An acceptance lets
   Prepare finish there, and the machine then runs on the timer feed.
3. **Debian 13 with its backport (3.6b) is in the same place as Ubuntu 26.04.** Both gates refuse it by string. After
   an acceptance all 12 rows are set and the machine runs on the timer feed.
4. **The rolling distributions and Ubuntu 26.10 pass both gates, and the measurement holds for their builds as far as
   a Mac can show.** Fedora 43, 44 and rawhide, Arch, Debian testing and sid, and Homebrew on Linux ship 3.7c. Ubuntu
   26.10 ships 3.7b. Debian's and Ubuntu's patched builds of those versions passed every check, and Fedora, Arch and
   Homebrew apply no patches.
5. **On a single version, old or new, the live connection works on every build.** The shipping `TmuxControlClient`
   over `CONTROL_ATTACH_ARGS` greeted within 26 ms. It answered `refresh-client -f no-output` with an empty block and
   received no `%output` after it. It produced every notification the parser names, returned a list byte-equal to the
   same list over exec, and ended with `%exit`. That held on all 20 targets from 3.2a to 3.8-rc, twice. Phase 320.1's
   six command shapes answered on every one: `goto-line` exists on all of them, and `#{copy_position_limit}` is empty
   before 3.7, which `src/main/tmux/scroll.ts` already expects. The control dialect is not what separates old tmux
   from new.
6. **What breaks is an upgrade that crosses 3.6.** With a server at 3.5a or older and a tmux program at 3.6 or newer,
   the live connection never greets and the shipping client's 10 s deadline ends it. The attach exits at once with
   "open terminal failed: not a terminal". Every measured upgrade that does not cross 3.6 works, and so do both
   downgrades measured. The cause is a change to the message header inside tmux 3.6 (`compat/imsg.h`) that leaves
   tmux's own protocol number at 8, so neither a version string nor tmux itself can see it. Three routes reach it
   without a reboot:
   - Debian 13 installing its 3.6b backport;
   - Fedora 43's July 2026 update from 3.5a to 3.7;
   - Ubuntu 24.04 upgrading to 26.04.

   Today's gates cannot reach this only because every server they admit is 3.6a or newer.
7. **The chosen policy keeps both gates as they are and widens them by two measured rows.** Add `3.6` and `3.6b` to
   `TESTED_REMOTE_TMUX_VERSIONS` for both planes, each with a subject that says what was built. Older servers join
   neither list until a separate phase makes Prepare boot them and reads the machine's tmux program beside its running
   server, so that a pair across 3.6 is told the truth. Add 3.8 when it ships final, measured with a 3.7c server under
   a 3.8 program. Every wider idea was attacked and rejected: version arithmetic, a gate that reads the platform, a
   capability probe, and an acceptance on the live connection (§4).
8. **The 3.6 family carries two tmux defects, and the admitted 3.6a is one of that family.**
   - **The server can end.** A live-connection client killed with SIGKILL in the first 3 ms or so of its handshake
     ends the whole server, and every session in it goes too. That happened 3 times in 734 trials on 3.6a and 0 times
     in 400 on 3.7c. Tortie never sends that signal. Hangups, terminations and closed pipes ended it 0 times in 1,500,
     1,500 and 1,000 trials.
   - **The client can wedge.** Under upstream issue 5049, a live-connection client can fail to exit after its input
     ends.

   Neither changes a verdict. Separately, an older tmux program's live connection ends a 3.6-family server every time.
   The only thing that stops Tortie doing that is the version read its transport makes before every spawn
   (`src/main/machines/control-plane.ts:477-483`), and nothing records that read as load-bearing.
9. **The reporter's machine cannot be narrowed from the tree.** His session proves only that his far tmux ran
   `new-session`. By reading, a create after a failed Prepare is reachable. 3.6 or newer is the likelier reading, but
   only that. `tmux -V` and `cat /etc/os-release` would settle it, and whether to ask him is the operator's call.
10. **The round found defects in today's product.** Each is its own entry (§9) and none is fixed here:
    - the false sentence and JSON detail after a boot refusal;
    - a refused machine drawn as one that "did not answer";
    - an acceptance sheet whose promises are false on 3.2a to 3.5a;
    - a git build offered an acceptance that is then refused;
    - a Debian 13 machine stuck after its backport.

## 2. What each distribution ships, and what it gets

### 2.1 The package data, read as data on 2026-09-23

| Distribution | Status | Source package | What the binary prints, and how that was read | Build flags | Patches, and the files each touches |
| --- | --- | --- | --- | --- | --- |
| Ubuntu 22.04 LTS jammy | Supported | 3.2a-4ubuntu0.2 | `3.2a`, the one version constant in the amd64 `.deb` | `--enable-utempter` | `platform-quirks.diff` (`compat.h`); `upstream-32f2d9d089ce.diff` (`tmux.c`); `upstream-b1a8c0fe022e.diff` (`configure.ac`, the cross-compile arm only); `lp1976110-respect-sizing.diff` (`cmd-new-session.c`); `CVE-2022-47016.patch` (`control.c`, `file.c`, `window.c`) |
| Ubuntu 24.04 LTS noble | Supported | 3.4-1ubuntu0.1 | `3.4`, amd64 `.deb` | `--enable-utempter --enable-systemd --enable-sixel` | `platform-quirks.diff`; `lp-2068393-fix-sixel-invalid-colour-register.patch` (`image-sixel.c`, `input.c`, `screen-write.c`, `screen.c`) |
| Ubuntu 26.04 LTS resolute | Current stable | 3.6a-2ubuntu0.1 | **`3.6`**, the only version constant in the amd64 and the arm64 `.deb`; `3.6a` appears only in the package-note JSON | jemalloc and systemd on Linux, `--enable-sixel` | `platform-quirks.diff`; `CVE-2026-11623.patch` (`image.c`, `screen.c`, `tmux.h`) |
| Ubuntu 26.10 stonking | Development series | 3.7b-1 | `3.7b`, amd64 `.deb` | as 26.04 | `platform-quirks.diff` |
| Debian 12 bookworm | oldstable | 3.3a-3 | `3.3a`, amd64 `.deb` | `--enable-utempter` | `platform-quirks.diff`; `upstream-0f6227f46b.diff` (`cmd-set-buffer.c`); `upstream-19344efa78.diff` (`compat/getpeereid.c`, a branch Linux does not compile) |
| Debian 12 bookworm-backports | | 3.5a-2~bpo12+1 | `3.5a`, amd64 `.deb` | jemalloc and systemd on Linux, `--enable-sixel` | `platform-quirks.diff`; `upstream-934035db71.diff` (`input.c`) |
| Debian 13 trixie | stable | 3.5a-3 | `3.5a`, amd64 `.deb` | as bookworm-backports | as bookworm-backports |
| Debian 13 trixie-backports | | 3.6b-1~bpo13+1 | `3.6b`, amd64 `.deb` | as above | `platform-quirks.diff` |
| Debian forky (testing) and sid | | 3.7c-1 | `3.7c`, amd64 `.deb` | as above | `platform-quirks.diff` |
| Fedora 43, 44 and rawhide | | 3.7c (2.fc43, 1.fc44, 1.fc46) | not read as bytes; built from `tmux-3.7c.tar.gz` | `--enable-sixel --enable-systemd --enable-utempter` | none |
| Arch Linux, `extra` | | 3.7_c-1, built 2026-08-17 | not read as bytes; builds git tag `3.7c` | `--enable-sixel --enable-systemd --enable-utempter` | none |
| Homebrew on Linux | | 3.7c | not read as bytes | `--enable-utf8proc`; jemalloc on macOS only | none |

Not rows: Ubuntu 25.10 questing (3.5a-3build1), which Launchpad marks Obsolete, and Ubuntu 20.04 focal (3.0a-2ubuntu0.4,
ESM), which is older than anything measured here.

Sources, each read on 2026-09-23:
- **Launchpad:** `api.launchpad.net/1.0/ubuntu/+archive/primary?ws.op=getPublishedSources&source_name=tmux` (07:16Z)
  and `api.launchpad.net/1.0/ubuntu/<series>` for each series' status (08:01Z); source files from each version's
  Launchpad `+sourcefiles` page and `archive.ubuntu.com/ubuntu/pool/main/t/tmux/`.
- **Debian:** `deb.debian.org/debian/pool/main/t/tmux/` (the `.dsc`, the `.debian.tar.xz` and the amd64 `.deb`);
  the buildd log for 3.7c-1 amd64 at `buildd.debian.org` (07:38Z); `bugs.debian.org/1070724`.
- **Fedora:** the spec and `sources` at `src.fedoraproject.org/rpms/tmux`, at named dist-git commits (08:03Z); the
  update history at `bodhi.fedoraproject.org/updates/?packages=tmux`, pages 1 to 7 (07:59Z).
- **Arch:** the `PKGBUILD` for `extra/tmux`.
- **Homebrew:** `formulae.brew.sh/api/formula/tmux.json` and `Formula/t/tmux.rb` in homebrew-core (07:35Z).
- **Upstream:** `api.github.com/repos/tmux/tmux/releases` (06:47Z and 07:37Z), and source files at each tag from
  `raw.githubusercontent.com/tmux/tmux/<tag>/<file>`.

The copies are in `A/debsrc/`, `A/debbin/`, `A/fedora/`,
`A/logs/{arch-PKGBUILD,brew-tmux.json,fedora-tmux.spec,gh-releases.json}`,
`adv/dl/` and `judge/results/bodhi-tmux*.json`.

### 2.2 Why Ubuntu 26.04's "3.6a" is 3.6

- **Investigator A.** The orig tarball `tmux_3.6a.orig.tar.gz` is a git archive whose `configure.ac` reads
  `AC_INIT([tmux], 3.6)`. Its 196 source files are byte-identical to upstream `tmux-3.6.tar.gz` (sha256
  `136db80c…`), and 16 of them differ from `tmux-3.6a.tar.gz`, `format.c`, `server-client.c` and `window-copy.c`
  among them. Debian's `3.6a-1` `debian/watch` carries `Uversion-Mangle: s/$/a/`, which appended the letter, and
  `3.6b-1`'s changelog reads "d/watch: remove Uversion-mangle". The amd64 binary holds one NUL-delimited version
  constant, `3.6`. A build of 3.6 with Ubuntu's two patches prints `tmux 3.6`, and `#{version}` reads `3.6`.
- **The adversary, by a different method.** The orig's pax header carries
  `comment=0dac7fe434d029a4f0b819cba8eb7963df291990`.
  GitHub's tag object for `3.6` dereferences to commit `0dac7fe4`; `3.6a` dereferences to `cc117b50`. The arm64
  `.deb`, a different architecture from A's, holds exactly one version constant, `3.6`.

So Ubuntu 26.04 lacks the 3.6 to 3.6a upstream fixes, among them "Fix a buffer overread and an infinite loop in
format processing (issue 4735)". The one trigger A tried, `display-message -p 'abc#'`, answered in 3 to 4 ms on 3.6,
Ubuntu's 3.6 and 3.6a alike, and the server kept answering. No format Tortie composes ends in a bare `#`. On every
check in the matrix, Ubuntu's 3.6 behaved exactly like 3.6a.

### 2.3 Fedora moves tmux by minor versions inside a stable release

Read from Bodhi. Fedora 43 was released with 3.5a-7, then moved to 3.7-3 (2026-07-10, a security update), 3.7b-3
(07-12) and 3.7c-2 (08-27). Fedora 44's builds went 3.6-1 (2025-11-27, a day after upstream), then 3.6a, 3.6b, 3.7-2,
3.7b-2 and 3.7c-1 (08-21). Fedora 45 and 46 carry 3.7c. Two things follow:
- **Fedora 43's July update crossed 3.6 in place**, with no reboot (§3.4).
- **Fedora shipped `3.7` for one to two days.** A server started in that window still reports `3.7` until it
  restarts, and `3.7` is on no list and was not built here.

### 2.4 Which patches touch the control path

The entry asked for a list of the files the live connection depends on, starting from `control.c`,
`control-notify.c`, `cmd-refresh-client.c`, `cmd-send-keys.c`, `cmd-display-message.c`, `window-copy.c`,
`format.c`, `server-client.c`, `client.c` and `tmux-protocol.h`. Investigator A added `cmd-new-session.c`, because
it holds the command the attach runs. The attack added `compat/imsg.c` and `compat/imsg.h`, because 3.6 changed the
wire there (§3.4). No distribution patches either of those two files.

Two distribution patches touch the list, both Ubuntu 22.04's:
- **`CVE-2022-47016.patch`** adds NULL checks to `control.c`, `file.c` and `window.c`. Each one stops the server
  only when memory runs out.
- **`lp1976110-respect-sizing.diff`** makes a detached `new-session -x 100 -y 30` come out 100×30, where upstream
  3.2a gives 80×24 (`A/harness/sizing.mjs`). Tortie's create sends no `-x` or `-y`, and the `gmux-control` attach is
  80×24 with or without the patch.

No other patch touches a listed file. Every Debian and Ubuntu patch set applied cleanly on macOS and changed no
measured cell (§3.1).

### 2.5 The per-row matrix

Each cell is **measured**, **refused**, **empty**, **hung** (with the deadline that ended it) or **not run** (with the
reason). Rows are distributions; the three controls sit at the foot. "Boot" is the twelve `SERVER_OPTIONS` rows;
"exec" is the four shapes `build/probe-execplane.mjs` measures plus `REMOTE_LIST_FORMAT`'s ten `q:` fields;
"live, same version" is the shipping client over `CONTROL_ATTACH_ARGS`; "320.1" is the six shapes and
`STATE_FORMAT`'s eight fields.

| Row | Prints | Boot | Exec | Live, same version | 320.1 | Upgrade pair | Today | Chosen policy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ubuntu 22.04 | `3.2a` | refused at row 4 (`allow-passthrough`); rows 10 and 11 refused | measured; `capture-pane -J` pads every line | measured | measured; `copy_position_limit` empty | 3.2a to 3.4 (to 24.04): measured, works | refused on both; an acceptance leads to a failed Prepare | stays refused |
| Debian 12 | `3.3a` | refused at row 10 (`copy-mode-position-format`); row 11 refused | measured | measured | measured; empty | 3.3a to 3.5a (backports): measured, works | refused; failed Prepare | refused until the boot and pair phase |
| Debian 12 backports, Debian 13 | `3.5a` | refused at row 10; row 11 refused | measured | measured | measured; empty | 3.5a to 3.6b (trixie-backports): **hung**, no greeting, ended by the 10,000 ms deadline; attach exit 1 at 13 ms | refused; failed Prepare | refused until the boot and pair phase |
| Ubuntu 24.04 | `3.4` | refused at row 10; row 11 refused | measured; a `$` in a stamp is stored as `\$` | measured | measured; empty | 3.4 to 3.6 (to 26.04): **hung**, 10,000 ms deadline; attach exit 1 at 11 ms | refused; failed Prepare | refused until the boot and pair phase and the `$` fix |
| Ubuntu 26.04 | `3.6` | measured, 12 of 12 | measured | measured | measured; empty | 3.6 to 3.7b (to 26.10): measured, works | refused on both; an acceptance gives sessions on the timer feed | **added to both** |
| Debian 13 backports | `3.6b` | measured, 12 of 12 | measured | measured | measured; empty | 3.6b to 3.7c: measured, works | as Ubuntu 26.04 | **added to both** |
| Ubuntu 26.10 | `3.7b` | measured, 12 of 12 | measured | measured | measured; a number | 3.7b to 3.7c: measured, works | admitted on both | unchanged |
| Debian testing, sid | `3.7c` | measured, 12 of 12 | measured | measured | measured; a number | 3.7c to 3.8-rc: measured, works | admitted on both | unchanged |
| Fedora 43, 44, rawhide | `3.7c` by source | not run: Fedora's binary is Linux-only; upstream 3.7c measured 12 of 12 | not run, same reason; upstream measured | not run, same reason; upstream measured | not run, same reason; upstream measured | Fedora 43's 3.5a to 3.7: not run for 3.7, which was not built; 3.5a to 3.7b **hung** | admitted on both | unchanged |
| Arch | `3.7c` by source | not run: Arch's binary; upstream measured 12 of 12 | as Fedora | as Fedora | as Fedora | 3.7c to 3.8-rc: works | admitted on both | unchanged |
| Homebrew on Linux | `3.7c` | not run: Linux bottle; upstream measured 12 of 12 | as Fedora | as Fedora | as Fedora | 3.7c to 3.8-rc: works | admitted on both | unchanged |
| 3.8-rc, for direction | `3.8-rc` | measured, 12 of 12 | measured; `q:` also escapes `{` and `}`, and the shipping parser round-trips it | measured; the greeting's `%window-add` and two `%sessions-changed` before `%exit` are dropped, and `%exit` still arrives | measured; a number | as the program over a 3.7c server: works; as a server under a 3.7c program: works | refused on both; an acceptance gives the timer feed | no row until 3.8 is final |
| Control: Homebrew 3.6a on this Mac | `3.6a` | measured, 12 of 12 | measured | measured | measured; empty | 3.6a to 3.7c: works; 3.7c server under a 3.6a program: works | admitted on both | unchanged; its note gains the two 3.6-family defects |
| Control: vendored 3.7b | `3.7b` | measured, 12 of 12 | measured | measured | measured; a number | 3.7b to 3.7c: works | admitted on both | unchanged |
| Control: upstream 3.7c | `3.7c` | measured, 12 of 12 | measured | measured | measured; a number | 3.7c to 3.8-rc: works | admitted on both | unchanged |

Every control passed every check in both passes, so the harness is valid. The upstream builds of 3.2a, 3.3a, 3.4,
3.5a, 3.6, 3.6a and 3.6b and the Debian and Ubuntu patched builds gave the same answer as the row above them in every
cell.

## 3. What was built and driven

### 3.1 The builds

**Investigator A's builds, 18 of them.** Upstream 3.2a, 3.3a, 3.4, 3.5a, 3.6, 3.6a, 3.6b, 3.7b, 3.7c and 3.8-rc.
Distribution-patched Ubuntu 3.2a-4ubuntu0.2, Debian 3.3a-3, Ubuntu 3.4-1ubuntu0.1, Debian 3.5a-3, Ubuntu
3.6a-2ubuntu0.1 (built from 3.6), Debian 3.6b-1~bpo13+1, Ubuntu 3.7b-1 and Debian 3.7c-1.
- **Where and how.** Built by `A/harness/build.mjs` into `A/builds/<id>/bin/tmux`; logs in `A/logs/build.log` and
  `A/results/build-*.json`.
- **The builder was copied, not run.** The entry said to run `build/build-tmux-version.mjs` with a row added to
  `build/tmux-probe-versions.json` in the worktree. That builder writes into the worktree's
  `build/vendor/tmux-probe/`, which was outside this round's write limit, so its six rules were copied into scratch
  and changed only where they write:
  - libevent 2.1.12-stable and utf8proc 2.10.0 from the ship pin's own URL and sha256 (`build/tmux-release.json`),
    static;
  - `pkg-config` sealed to those two prefixes;
  - each tarball checked against its sha256 before unpacking;
  - `-V` required to print exactly `tmux <version>`;
  - one scratch server on `p322-<id>-invA` whose `#{version}` is read, killed by its own pid in a `finally`.

  `build/tmux-probe-versions.json` is byte-identical to the parent.
- **Flags.** `--enable-utf8proc` on every build, and `--disable-jemalloc` where configure knows the flag (3.5a and
  later). `--enable-sixel` was added on each distribution variant whose rules pass it; it is the only Linux build
  flag that could be reproduced here.

**The exact failures on the way, and what was done.**
1. **utf8proc was not found on 3.2a and 3.3a.** The first configure on each stopped with
   `configure: error: "utf8proc not found"`. Those versions find utf8proc through `AC_CHECK_HEADER` and
   `AC_SEARCH_LIBS` rather than `pkg-config` (3.2a `configure.ac:344-364`), so the sealed prefix was passed through
   `CPPFLAGS` and `LDFLAGS`.
2. **Ubuntu's 3.2a patch set asked for automake.** `upstream-b1a8c0fe022e.diff` edits `configure.ac`, and `make` then
   tried to regenerate: `aclocal-1.15: command not found`, then `make: *** [aclocal.m4] Error 127`. This Mac has no
   automake and nothing was installed. The patch changes only the cross-compile arm of `configure.ac`, so the
   generated files were touched newer rather than regenerated. The build records that it did this.
3. **3.7c stops its own configure on macOS unless given a jemalloc flag**, as the existing probe pin records.

**Every patch applied with no fuzz and no offset:** Ubuntu 3.2a (5), Debian 3.3a-3 (3), Ubuntu 3.4 (2), Debian
3.5a-3 (2), Ubuntu 3.6a (2), Debian 3.6b backport (1), Ubuntu 3.7b (1), Debian 3.7c (1).

**The adversary's builds, by a different method.** `adv-ubuntu-3.2a` (all five Ubuntu patches), `adv-3.7c` (with
`--enable-sixel`), `adv-3.8-rc`, and `adv-3.6a` (unstripped, for a crash stack).
- **Where and how.** Built by `adv/harness/build.sh`; logs in `adv/logs/build-adv-*.log`.
- **What differed from A's builds.** Each linked Homebrew's `libevent_core` 2.1.12 and `ncursesw` 6.6 dynamically.
  Each used `--disable-utf8proc`, as the Linux distributions do (Debian's buildd log reads `utf8proc: off`). Each was
  built with Debian's hardening flags:
  `-g -O2 -fstack-protector-strong -D_FORTIFY_SOURCE=2 -Wformat -Werror=format-security`.
- **How the patches were held.** Applied with `patch -p1 -F0 -N`. Any offset, fuzz, `FAILED`, `Reversed`, `.rej` or
  `.orig` failed the build. The Ubuntu `debian/` directory it downloaded was byte-identical to A's (`diff -r`).

The two methods agree on every cell both checked: utf8proc on and off, static and dynamic libevent, with and
without hardening.

**Also run, read-only, on their own sockets.** Homebrew's `/opt/homebrew/Cellar/tmux/3.6a/bin/tmux` (sha256
`70cbf669…`), which is the subject of the 3.6a row. A copy of the vendored `build/vendor/tmux/bin/tmux` from the
operator's checkout (sha256 `d7002f7d…`).

### 3.2 Each tarball against a second source

| Version | Upstream tarball sha256 | Second source | Agrees? |
| --- | --- | --- | --- |
| 3.2a | `551553a4f82beaa8dadc9256800bcc284d7c000081e47aa6ecbb6ff36eacd05f` | Ubuntu `.dsc` `Checksums-Sha256` for the orig, fetched separately by A and by the adversary | byte-equal |
| 3.3a | `e4fd347843bd0772c4f48d6dde625b0b109b7a380ff15db21e97c11a4dcdf93f` | Debian `.dsc` | byte-equal |
| 3.4 | `551ab8dea0bf505c0ad6b7bb35ef567cdde0ccb84357df142c254f35a23e19aa` | Ubuntu `.dsc` | byte-equal |
| 3.5a | `16216bd0877170dfcc64157085ba9013610b12b082548c7c9542cc0103198951` | both Debian `.dsc`s; SHA512 equal to Fedora f41 and f42 `sources` | byte-equal |
| 3.6 | `136db80cfbfba617a103401f52874e7c64927986b65b1b700350b6058ad69607` | Fedora dist-git `sources` at `5b3b85bc` (SHA512); the Ubuntu orig is a git archive | byte-equal to Fedora; content-equal to Ubuntu, 196 of 196 files |
| 3.6a | `b6d8d9c76585db8ef5fa00d4931902fa4b8cbe8166f528f44fc403961a3f3759` | Fedora dist-git `sources` at `44223384` (SHA512 `bdc1a1dc…`) | byte-equal |
| 3.6b | `390759d25fdba016887ec982b808927e637070fd7d03a8021f8ef3102b9ae3c7` | Fedora dist-git at `dd06b240`; the Debian orig is a git archive at `8f3f14f` | byte-equal to Fedora; content-equal to Debian, 196 of 196 |
| 3.7b | `87f2e99e3b685973f2ca002ffd6ed7e51a5744f7009daae5a15670b6d532db96` | the ship pin; the Ubuntu orig is a git archive at `3423e0d` | equal to the pin; content-equal to Ubuntu, 199 of 199. **Fedora's 3.7b SHA512 `0f9724ef…` differs from upstream's `4d97a285…`. Recorded, not resolved** |
| 3.7c | `7c60cae9a0e25288e2e24750aafc9e8800fc7fd4555e447e1b29ee4201cfb3bf` | the probe pin and the Homebrew formula | byte-equal. **Fedora's lookaside, SHA512 `62139a27…` and 1,138,228 bytes, is git-archive shaped, and the asset at the same URL today is `86c4c136…` and 789,431 bytes. Content-equal across 199 files. Recorded, not resolved** |
| 3.8-rc | `decb97e52e91a459f9b9d5726d64cd7cb87506eca1090817da6cc84a9a71eb51` | none outside GitHub | not checked |

### 3.3 What was driven, and how

Every drive ran from the worktree through the pinned tsx:

```
cd /private/tmp/wt-p322
node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.node.json \
  <scratchpad>/p322/A/harness/drive.mts <build-id>
```

`drive.mts` imports the shipping modules from `src/main`: `tmuxCommand` from `machines/context.ts`;
`TmuxControlClient`, `CONTROL_ATTACH_ARGS` and `quoteTmuxArg` from `tmux/control-client.ts`; `remoteBootArgs`;
`remoteBootOptions`, `setOptionArgs`, `showOptionArgs` and `runtimeValueOf`; `REMOTE_LIST_FORMAT`,
`parseRemoteListLine` and `remoteCreateArgs`; `remoteStampArgs`; `remoteCaptureArgs`; and `remotePathCommand`. Each
far string is `tmuxCommand`'s last argv element with `remoteTmuxPath` set to the scratch build, for example
`<build>/bin/tmux -L p322-<id>-invA -f /dev/null -C new-session -A -s gmux-control`, run as `/bin/sh -c` with a
scratch `HOME` and `SHELL=/bin/sh`. Twenty targets were driven twice: the 18 builds, Homebrew's 3.6a and the
vendored 3.7b. The first pass is in `A/results/run1/` and the second in `A/results/drive-<id>.json`, with raw
control streams in `A/logs/drive-<id>-control.raw`. No recorded field differed between the passes.

**Prepare.** The run covered:
- the version reads and all three gate outcomes;
- `remoteBootArgs()`, which is `start-server ; set-option -s exit-empty off`;
- the `PATH` capture and `set-environment -g PATH`;
- then every row, sent with `setOptionArgs` and read back with `showOptionArgs`.

The harness does not stop at a refusal, as Prepare does, and it names where Prepare would stop. The refusals, exactly
as tmux printed them, each with exit 1:

```
invalid option: allow-passthrough              (row 4, 3.2a only)
invalid option: copy-mode-position-format      (row 10, 3.2a to 3.5a)
invalid style: noattr,bg=default,fg=default    (row 11, 3.2a to 3.5a)
```

Every other row was answered and read back equal, on every build, in both passes. From 3.6 upward nothing was
refused. `execOn` rejects on a non-zero exit (`src/main/machines/exec-plane.ts:614-626`), so Prepare throws at the
first refusal. The adversary read what that leaves on its own Ubuntu 3.2a build: `history-limit` 2000,
`default-terminal` `screen`, `remain-on-exit` off and `mode-style` `bg=yellow,fg=black`.

**What the person reads after that refusal.** This was composed by the shipping `classifyMachineOutput`,
`classifyTmuxFailure` and `composeOutcomeCopy` over all three stderr lines (`B/gate-probe.json`, key
`bootFailureCopy`; `A/harness/copy.mts`). Each gave class `unknown` and the headline "Tortie could not reach this
machine, and it does not recognise the reason." The detail is the `GmuxError` payload as JSON,
`{"code":"UNKNOWN","message":"mybox: tmux set-option failed: Command failed: /usr/bin/ssh …`, because `err.message`
is `JSON.stringify(payload)` (`src/main/errors.ts:88-89`) and `src/renderer/settings/MachineRow.tsx:141` draws it
raw. This was composed,
not drawn in the app.

**The exec shapes.** The run covered:
- `list-sessions -F '#{session_id}'` on an empty running server (exit 0, no rows, every version);
- `show-options -gv history-limit`;
- the no-server sentence, `no server running on <path>` with exit 1, classified `no-server` on every version;
- `-V` read through the login shell and parsed correctly by `parseTmuxVersion` on every version;
- a create through `remoteCreateArgs` (exit 0, `$0`) with the four stamps;
- `REMOTE_LIST_FORMAT` answering 10 fields on every build, and round-tripping through `parseRemoteListLine` except
  on 3.4.

Two exec-plane quirks came out, both moot today because those versions fail Prepare:
- **3.4 stores `$` as `\$`.** `set-option -t s @n 'a $HOME …'` reads back as `a \$HOME …`, so a `@gmux-name` holding
  `$HOME` comes back as `\$HOME`. The adversary reproduced this on Ubuntu's patched 3.4.
- **3.2a's `capture-pane -J` pads every line.** `remoteCaptureArgs($N, 10000)` returned 63,001 bytes, with trailing
  spaces on all 3,000 lines, where the same pane gives 13,894 bytes without `-J` or on 3.3a and later
  (`A/harness/captj.mjs`).

**The live connection.** The shipping `TmuxControlClient` was driven with a transport whose plan is
`tmuxCommand(ctx, CONTROL_ATTACH_ARGS)`'s far string. On all 20 targets:
- **The greeting** arrived in 9.9 to 25.8 ms, against the 10,000 ms deadline.
- **`refresh-client -f no-output`** was answered with `%end` and an empty body. After typing into `gmux-control`, the
  shipping client saw 0 `%output` lines, while a raw control client beside it saw 2 to 13, so the check can fail.
- **The notifications.** A second client's create gave `%sessions-changed`, its rename gave
  `%session-renamed $2 p322-renamed`, and its kill gave `%sessions-changed`.
- **The list.** `list-sessions -F REMOTE_LIST_FORMAT` over the live connection was byte-equal to the same list over
  exec (528 to 564 bytes).
- **The end.** `kill-server` gave `%exit`, and the control child exited.

A normalised stream diff against 3.7c (`A/harness/dialect.py`, `A/results/dialect.json`) differs in three places
only:
- the eighth `STATE_FORMAT` field is empty before 3.7;
- the name in `%unlinked-window-renamed` is a sampled process name and varies between runs;
- 3.8-rc drops the greeting's `%window-add` and the two `%sessions-changed` before `%exit`.

`%sessions-changed` is one of the parser's arms (`control-client.ts:405-408`). Dropping it is harmless because `%exit`
follows.

**Phase 320.1's six shapes.** These went through the shipping `scroll.ts` functions over that same connection, with
research 130's runner (`args.map(quoteTmuxArg)` into `sendCommand`).
- **The sequences.** On all 20 targets, twice, `scrollPaneBy(+30)` reached 30, `scrollPaneTo(1500)` 1500,
  `scrollPaneBy(-10)` 1490, `scrollPaneBy(+2500)` 2977 (clamped through `goto-line 2977`) and `exitPaneScroll` 0.
- **With no mode.** `send-keys -X top-line` and `cancel` answered "not in a mode" on every build.
- **The eight fields, parked.** Parked, `STATE_FORMAT` read `pane_in_mode=1`, `scroll_position=7`,
  `history_size=2977`, `pane_height=24`, `alternate_on=0`, `mouse_any_flag=0` and `pane_width=80`.
  `copy_position_limit` was empty on 3.2a to 3.6b and 2977 on 3.7b, 3.7c and 3.8-rc.
- **On a program that asked for the mouse.** A pane that sent 1049 and 1000/1002/1006 read `alternate_on=1` and
  `mouse_any_flag=1` on all 18 builds (`A/results/altmouse.json`).

**What a person would see while parked.** Tortie's remote attach argv, taken from `attachPlan`, ran in a node-pty fed
into `@xterm/xterm`, and the pane was parked the way `scroll.ts` parks it. Row 0 then read:

| Builds | Row 0 after `copy-mode -e`, 30 lines up |
| --- | --- |
| 3.2a, 3.3a | `2942 … [30/2971]` |
| 3.4, 3.5a | `2942 … 03:06:54 [30/2971]` |
| 3.6 and later | `2942`, with no indicator |

That is tmux's own position indicator, which only `copy-mode-position-format` (row 10) can empty. **The adversary
found the way round it:** `copy-mode -e -H` hides the indicator on 3.2a, 3.4 and 3.5a (`adv/results/hide.json`), and
`-H` is in `cmd-copy-mode.c`'s argument template at 3.2a (`eHMs:t:uq`). `scroll.ts:382` and `:414` send
`copy-mode -e -t <target>` today.

**What a capability probe can see** (investigator B, own sockets `p322-3.6a-B-68621` and `p322-3.7b-B-68621`,
`B/gate-probe.json`).
- **It can see some differences.**
  - An unknown option name exits 1 with `invalid option`.
  - An unknown flag exits 1, for example `command capture-pane: unknown flag -I`.
  - `list-commands` gives 90 names on 3.6a and 91 on 3.7b, and only 3.7b's list has `new-pane`.
- **It cannot see others.**
  - An unknown copy-mode command exits 0, prints nothing and moves nothing, for example
    `send-keys -X p322-no-such-copy-command` or 3.8's `refresh-now` on 3.6a.
  - An unknown format variable expands to empty with exit 0.
  - The stream's framing cannot be asked about at all.
- **`set-option -q` rescues an unknown name but not an unknown value.** `set-option -q -g mode-style nolink,bg=default`
  still exits 1 with `invalid style` on both versions.

### 3.4 The pair an upgrade leaves behind

The adversary's harness (`adv/harness/pairs.mts`, results `adv/results/pairs-*.json`, raw streams
`adv/logs/pairs-*.control.raw`) runs each pair in four steps:
1. It boots the older build with `remoteBootArgs()` and the rows, and creates one session with `remoteCreateArgs`.
2. Through the newer program, it runs the version read and both gates.
3. It runs the shipping client with its 10 s deadline over a 14 s window.
4. It runs a pty attach with `attachPlan`'s remote argv, with an 8 s draw deadline and a 4 s detach deadline.

Every child pid was recorded and verified dead afterwards.

| Pair (server, then program) | Route | Version read | Live connection | Attach |
| --- | --- | --- | --- | --- |
| 3.5a, 3.6b (Debian) | Debian 13 to trixie-backports | `3.5a` | **hung**: 0 bytes in 10 s, ended by the deadline at 10,286 ms | exit 1 at 13 ms, "open terminal failed: not a terminal" |
| 3.4, 3.6 (Ubuntu) | Ubuntu 24.04 to 26.04 | `3.4` | **hung**, deadline at 10,183 ms | exit 1 at 11 ms, the same text |
| 3.5a, 3.6 (Ubuntu) | Ubuntu 25.10 to 26.04 | `3.5a` | **hung**, deadline | exit 1, the same text |
| 3.5a, 3.7b | harness control: `version.ts:24-26`'s pair | `3.5a` | **hung**, deadline | exit 1, the same text |
| 3.3a, 3.5a (Debian) | Debian 12 to bookworm-backports | `3.3a` | greeted; list byte-equal | drew in 25 ms, detached with exit 0 |
| 3.2a, 3.4 (Ubuntu) | Ubuntu 22.04 to 24.04 | `3.2a` | greeted; list equal | drew, detached |
| 3.6, 3.7b (Ubuntu) | Ubuntu 26.04 to 26.10 | `3.6` | greeted; list equal | drew, detached |
| 3.6a, 3.7c | Homebrew | `3.6a` | greeted; list equal | drew, detached |
| 3.6b, 3.7c | Debian backports to testing | `3.6b` | greeted; list equal | drew, detached |
| 3.7b, 3.7c | | `3.7b` | greeted; list equal | drew, detached |
| 3.7c, 3.8-rc | the rolling distributions | `3.7c` | greeted; list equal | drew, detached |
| 3.7c server, 3.6a program | a downgrade | `3.7c` | greeted | drew |
| 3.8-rc server, 3.7c program | a downgrade | `3.8-rc` | greeted | drew |

Working pairs connected 183 to 422 ms after start, with the harness's version read included.

**What the rule is.** A pair breaks when it crosses 3.6 and works when it does not.
- **The exec plane still answers across a broken pair.** `display-message` returns the server's version,
  `list-sessions` parses, and `set-option` answers.
- **The old server did run the command.** It held a `gmux-control` session afterwards. Only the answer never came
  back.
- **Debian's NEWS is right about 3.6 and wrong about 3.7.** Its paragraph for 3.6 is exact. Its paragraph for 3.7
  reproduced on no pair.
- **Where `version.ts` differs.** `version.ts:24-26` recorded "%exit and then HANGS" for 3.7b against 3.5a on
  2026-08-15. This round saw 0 bytes before the deadline.

**The cause, read from source and confirmed by the judge.**
- **The header changed.** 3.6 replaced `compat/imsg.{c,h}` with OpenBSD's `imsg.h` 1.24. The header's
  `uint16_t len; uint16_t flags` became `uint32_t len`, and `IMSGF_HASFD` is gone.
- **Nothing announces the change.** `tmux-protocol.h` and `client.c` are byte-identical between 3.5a and 3.6, and
  `PROTOCOL_VERSION` is 8 at every tag from 3.2a to 3.8-rc. So the `protocol version mismatch` arm in
  `classifyTmuxFailure` can never fire.
- **The result transfers to Linux.** Debian's 3.7c-1 amd64 buildd log (`adv/dl/buildd-3.7c-1-amd64.log:637`, `:881`)
  prints `checking for library containing imsg_add... no` and links `compat/imsg.o`, so Linux builds compile the
  same compatibility code with the same little-endian layout.
- **The next release does not repeat it.** `compat/imsg.h` is byte-identical between 3.7c and 3.8-rc.

**What the product does with a pair that never greets.** The adversary's harness saw the client spawn again 0.5 s
after the deadline. The judge read the product and ruled that it does not. The product handles `greeting-timeout`
in three steps (`control-plane.ts:641-651`):
1. It adds the machine to `noControlThisRun`.
2. It calls `closeControlPlane`, and `client.stop()` sets `stopped` before `handleDisconnect` runs, so
   `scheduleReconnect` schedules nothing (`control-client.ts:475-477`).
3. The link reads `polling`, and the machine keeps the timer feed until Prepare or a restart.

So the pair costs one 10 s wait per run and one per Prepare.

**A capability probe cannot see the pair.** `adv/harness/probe.mts` ran everything an exec-plane probe can ask
through the old program and then the new one, against one server:
- `#{version} #{pid} #{start_time}`;
- `list-commands`, counted and hashed;
- `show-options -g` and `-s`, hashed;
- `set-option -q` for all 12 rows;
- a format read;
- the list.

For 3.4 under 3.6 and 3.5a under 3.6b, the whole probe was byte-identical before and after, with the same server
incarnation (`3.4 28789 1790148910`). Over the same change, the live connection went from greeting in 11 ms to
never greeting, and the attach went from drawing to exit 1. A probe asks the server, and the part that breaks is
the program.

**The Debian 13 stuck state.** The judge upheld this, composed from measured pieces:
1. A failed Prepare on 3.5a leaves a server with `exit-empty off`.
2. After the backport is installed, that server still answers `3.5a` through the new program and still refuses rows
   10 and 11 on the server side.
3. So Prepare fails on every try until someone ends that server or the machine reboots.

Ubuntu's release upgrade normally reboots, which clears it. Debian's backport and Fedora's update do not.

**Rolling machines do not fall off on the day 3.8 ships.** The running 3.7c server keeps reporting `3.7c`, both gates
keep admitting it, and the live connection and the attach work through a 3.8-rc program. The machine falls off at
the far server's next restart, normally a reboot. This was measured on the release candidate, not on 3.8 final.

### 3.5 The 3.6 family's two defects

- **A server that ends when a live-connection client dies in its handshake.** The crash is in tmux, and it is fixed
  in 3.7b.
  - **Where it crashes.** The server takes a SIGSEGV in `control_stop` at `control.c:826`, called from
    `server_client_lost`, because `control_state` is still NULL. 3.7b added `if (cs == NULL) return;`. The adversary
    symbolicated this from macOS's crash report for its unstripped 3.6a build, and `control.c` is byte-identical
    between 3.6 and 3.6a.
  - **The adversary's sweep.** `adv/harness/race.mts` sends SIGKILL to `CONTROL_ATTACH_ARGS` after a swept 0 to 3.9 ms
    delay. It ended 3.6a after 348, 630 and 109 trials, at 2.7 to 2.9 ms, and Debian's 3.6b after 303, at 2.2 ms.
    3.7c survived 400 of 400.
  - **The judge's arms** (`judge/harness/race-modes.mts`, `judge/results/race-*.json`):

    | Arm | Trials | Servers ended |
    | --- | --- | --- |
    | SIGKILL, 3.6a with a 3.6a client | 734 | 3, at 2.26, 2.96 and 3.00 ms |
    | SIGHUP | 1,500 | 0 |
    | SIGTERM | 1,500 | 0 |
    | Pipes closed with no signal, what sshd does to a no-pty child when its channel goes | 1,000 | 0; 760 of the 1,000 children were still alive 150 ms later |
    | A 3.7b client SIGKILLed against a 3.6a server, this Mac's `TESTED_TMUX_PAIRS` pair | 182 | 3 |
    | A 3.7b client, SIGTERM | 1,500 | 0 |

  - **Why Tortie does not reach it.** Tortie ends a local control child with SIGTERM, and sends SIGKILL only 10 s after
    spawn. The far control child is ssh with no `-t`, so Tortie never delivers any signal to it.
  - **The one other route.** An older program running `-C` against a 3.6, 3.6a or 3.6b server ends it every time,
    Homebrew's 3.6a included. The transport's precheck runs `display-message` through that same program first. That
    read fails with "server exited unexpectedly", leaves the server alive, and throws before anything spawns. So the
    precheck is load-bearing.
- **The issue 5049 exit wedge.** The adversary drove the shipping client, ended `child.stdin` and watched the far
  client's pid for 6 s (`adv/harness/wedge.mts`).
  - With `gmux-control`'s pane printing continuously and a slow reader, the client never exited on Homebrew 3.6a (3
    of 3), Ubuntu's 3.6 (2 of 2) and 3.2a (2 of 2). 3.7b and 3.7c exited in 19 to 22 ms (0 of 2, 0 of 3).
  - With a fast reader, 3.6a wedged 0 of 3 times. On a fresh connect with a slow reader, 0 of 4.
  - SIGTERM ended every wedged client.
  - The source: 3.6a's `control_reset_offsets` frees `control_pane` without `control_discard_pane`, and 3.7c discards
    it.

Neither defect separates 3.6 or 3.6b from the admitted 3.6a.

## 4. The two gates, the options and the chosen policy

### 4.1 The gates as shipped

- **The exec gate** is `decideRemoteVersionGate` (`version.ts:318-331`). It has one product caller,
  `src/main/machines/prepare.ts:387`, which three doors reach:
  - Settings' Prepare (`src/main/machines/ipc.ts:976`);
  - the launch sign-in (`src/main/sessions/core.ts:1350`);
  - the sign-in retry (`src/main/machines/sign-in-retry.ts:290`), which starts at 30 s, doubles, then repeats every 5
    minutes while the machine is not prepared.
- **The control gate** is `decideRemoteControlGate` (`version.ts:271-282`), and it is asked in two places:
  - `openControlPlane` (`control-plane.ts:579`), reached only through `startMachineFeed` from Prepare's success
    (`prepare.ts:428`) and from `remoteCreate` (`remote-sessions.ts:1781`);
  - the transport's precheck (`control-plane.ts:477-483`, then `assertControlDialectMeasured` at `:503-518`), before
    every spawn and every reconnect.

  Once a client exists, `openControlPlane` returns at once (`:541`), so from then on only the precheck asks.
- **What they have in common.** Both compare the whole string byte for byte, read no `subject`, and read the
  SERVER's version. The binary's own `-V` is read only when no server answers (`prepare.ts:174-202`). The local gate
  has a pair list (`TESTED_TMUX_PAIRS`, `version.ts:112-114`); the remote gates have none.
- **The table's history.** Three commits in two days, and none in the 36 days since:
  - `4c86bea5` (Phase 69, 2026-08-17) wrote 3.6a and 3.7b as exec only;
  - `e9351e8f` (Phase 71, 2026-08-17) set `control: true` for both after `probe:controldialect`;
  - `069ef77c` (Phase 83, 2026-08-18) added 3.7c, the acceptance, the "IT TAKES NO ACCEPTANCE" paragraph and the 10 s
    greeting deadline.

  Every row's subject is a macOS copy. No row was ever added for a Linux reason.

**What the live connection adds, corrected.** The entry's table said a machine without one never has its output
copied. The judge upheld investigator B's correction. The status list runs on both feeds at 5 s focused and 30 s
idle. The copy taken when a person presses End (`captureRemoteSessionNow`, `remote-capsule.ts` around `:507`, called
from `core.ts` around `:2862`) asks only `readyRemoteContext` and runs on the timer feed too. Only the periodic
120 s copy needs the live connection (`remote-capsule.ts:381-383`). So a live connection adds four things:
- the list read when the machine says something changed;
- the periodic saved-output copy;
- loss noticed in 0.1 s or 19 s;
- after 320.1, scrolling for programs that did not ask for the mouse.

### 4.2 The options, what each costs, and what the attack did to it

The entry's four options, lettered as it lettered them:

- **(a) Add measured rows, each with a subject that names the copy honestly. Chosen.** It stays inside the house rule
  and costs one row per measured string. Neither gate reads `subject`, so a row measured from an upstream tarball
  admits every build that prints that string. The matrix shows that this is safe for 3.6 and 3.6b: no patch set changed
  a cell. It cannot help 3.2a to 3.5a on its own, because a row for them would claim an exec plane whose boot fails.
- **(b) Make the gate read `subject` or the platform. Rejected.** No patch changed a measured cell, so it would add a
  far read for no measured difference. That read needs a new call through the login-shell door, whose call sites
  `conformance:machines` condition 40 pins by name. The read could be `uname`, `/etc/os-release`, a package query or
  a binary hash, and a hash would drop every machine off the list at each security rebuild.
- **(c) Any rule wider than byte equality. Rejected.** The one measured break is at the 3.5a to 3.6 boundary, inside
  `compat/imsg.h`, where neither the version string nor `PROTOCOL_VERSION` can see it. Letter releases have changed
  validation before: 3.2a added an option value and 3.7a changed which session names are allowed. 3.8-rc widened
  `q:` quoting, changed `show-options -F`, turned the mouse default on and gave `remain-on-exit` a `key` value. A
  "same letter family" rule is the smallest widening, and even that is not free.
- **(d) Change nothing.** Ubuntu 26.04 LTS and Debian 13 with backports keep the timer feed and never get 320.1,
  while they measure like 3.6a on every check.

The options investigator B added, and what the attack did to each:

- **Admit by capability: probe once, cache per server. Rejected.** The probe was byte-identical across a broken
  pair (§3.4). It cannot see an unknown copy command, an unknown format variable or the stream's framing. A cache
  that skipped today's per-spawn version read would spawn through a rolled-back program and end a 3.6-family server.
- **An acceptance on the control gate. Rejected.** The failure the gate exists for turns out to be a server and
  program PAIR across 3.6. A person accepting a version string cannot see that pair, and the sheet names no fact
  about the live connection. It would also mean editing `version.ts:261-269`, `conformance:machines` condition 44,
  and the copy `assert-bundle-refusals` pins, because `MACHINE_VERSION_ACCEPT_OFFER` and
  `MACHINE_VERSION_ACCEPTED_HONESTY` both promise no live connection.
- **A Prepare that tolerates older servers. `-q` alone is refuted, and a per-row fallback works.** `set-option -q`
  rescues an unknown name and not an unknown value, so on 3.3a to 3.5a it moves the failure from row 10 to row 11. A
  per-row fallback does work. The judge ran it on Debian's 3.3a-3 (`judge/results/fallback-deb33a.json`), and the
  adversary on 3.2a, 3.4 and 3.5a:
  - `mode-style bg=default,fg=default` is accepted and reads back;
  - `copy-mode -e -H` hides the indicator;
  - `history-limit` has to be written first, so that a refusal can never leave it at 2,000.

  **The exception is `allow-passthrough` on 3.2a**, which has no fallback: images and other pass-through escapes
  reach the terminal there as nothing. The cost falls in two places:
  - condition 16's two-way comparison with `resources/gmux-tmux.conf` gains a fallback column;
  - the read-back table gains a `refused` state and a sentence.
- **A pair read, the program's `-V` beside the server's version.** It is required before any server older than 3.6
  joins either plane, because a gate that reads only the server would admit exactly the measured hang. It is NOT
  added for servers at 3.6 or newer, where every measured pair works, including both downgrades, and a pre-3.6
  program fails the precheck before anything spawns. There it would only refuse the rolling in-place upgrade (a
  3.7c server under a newer program), which works today. That would be a regression. The read already exists in
  `prepare.ts:197-201` through `execRemoteShell`.
  - **The Linux-only variant was not measured and is not proposed.** It would run the control child and the attach
    as `/proc/<server pid>/exe`, the exact bytes the server runs. That runs a path other than the confirmed
    `remoteTmuxPath`, so it would have to be argued against refusal 8 and Phase 12.7 F3.
- **Fix the copy.** This asks nothing of either gate, so it goes to its own entries (§9).
- **Copy saved output over the exec plane on the timer feed.** `capture-pane` is already an exec-plane ledger verb,
  so an accepted machine could have periodic saved output without a live connection. Moving 320.1's shapes there
  instead would break the ledger's at-least-once rule, because `send-keys -X -N n scroll-up` is not safe to run
  twice. The judge did not rule on this. It is recorded for whoever next owns the timer feed.

**What each option means for a person, by row.**

| Rows | (a) measured rows | (b) read the platform | (c) a wider rule | (d) nothing |
| --- | --- | --- | --- | --- |
| Ubuntu 22.04 and 24.04, Debian 12 and 13 | Prepare still fails; no row is possible until the boot and pair phase | the same, plus a far read | admits the cross-3.6 pair the day a pre-3.6 server is admitted | an acceptance leads to a failed Prepare |
| Ubuntu 26.04, Debian 13 backports | the live connection, then 320.1 | the same, plus a far read | the same as (a) | the timer feed after an acceptance; no 320.1 |
| Fedora, Arch, Debian testing, Homebrew, Ubuntu 26.10 | unchanged | a far read; a hash key drops them at each rebuild | admits 3.8 unmeasured | unchanged until 3.8 and a restart |

**How often the list would need a row.** In the 365 days to 2026-09-23 upstream published 7 stable strings and one
release candidate. The dates:

| Release | Published |
| --- | --- |
| 3.6 | 2025-11-26 |
| 3.6a | 2025-12-05 |
| 3.6b | 2026-05-20 |
| 3.7 | 2026-06-26 |
| 3.7a and 3.7b | 2026-07-01 |
| 3.7c | 2026-08-17 |
| 3.8-rc | 2026-09-09 |

Over five years there are 12 stable strings, and the median gap between them is 46 days. Letter releases follow a
minor release within 0 to 8 days, so each minor needs 2 to 4 rows, bunched into about two months. Arch built 3.7c on
the day upstream published it, and Fedora built 3.6 a day after. Shipping speed is not the constraint: Tortie made 14
releases between 2026-09-01 and 2026-09-21. The constraint is noticing, because nothing in the product tells anyone
that a Linux machine fell off the list. The judge's refinement makes this cheaper than the entry feared, because a
rolling machine falls off at its far server's restart, not on release day.

### 4.3 The chosen policy

The judge's ruling:

1. **Keep both gates as they are in kind.** Each compares the whole version string the SERVER reports, byte for
   byte, against measured rows only, and the control gate takes no acceptance. Widen them only by measured rows whose
   `subject` names the copy honestly, which is the entry's option (a).
2. **Now, add `3.6` and `3.6b` to both planes.** `3.6` is Ubuntu 26.04 LTS, which labels it 3.6a, and `3.6b` is
   Debian 13's backport. Both answered every check 3.6a answers, on upstream builds and on the distributions' patched
   builds. Both sit on the same side of 3.6's wire change as every admitted row. This is a Tier 3 build: two rows,
   their conformance, and a pin that the transport's precheck read stays before every spawn.
3. **Not now: 3.2a, 3.3a, 3.4 and 3.5a.** They join neither list until a separate Tier 3 phase lands two things:
   - a Prepare that boots them, with named per-row fallbacks, `mode-style bg=default,fg=default`, copy mode entered
     with `-H`, and `history-limit` written first;
   - a read of the machine's tmux program beside its running server, admitting a pre-3.6 server only with a program
     measured against it.

   The pair read is needed because the one failure the control gate was written for is a pair across 3.6, which a
   server-only gate cannot see, and Debian 13's backport and Fedora 43's July update both produce it without a
   reboot.
4. **Servers at 3.6 or newer keep the server-only read.** Every measured pair among them works, including 3.7c to
   3.8-rc and both downgrades, and a pre-3.6 program fails the precheck before anything spawns. A pair gate there
   would only regress the rolling in-place upgrade that works today.
5. **3.8 joins when it is final**, measured with a 3.7c server under a 3.8 program. 3.8-rc never joins.

The judge's reason: this is the only option in which every admission rests on a measurement of the thing that
actually fails.

## 5. What the reporter's machine can be

Investigator A read the reporter's machine as 3.6 or newer, because a session needs a finished Prepare. Investigator
B said the only proof is that `new-session` ran. The judge upheld B and made it stronger by reading the code:
- **A failed Prepare still leaves a usable machine.** `prepareMachine` registers the context before the version read
  (around `prepare.ts:281`), and `ensureRemoteServer` captures `PATH` before the option loop. Those are the only two
  things `readyRemoteContext` asks for (`src/main/machines/ready-context.ts:35-61`).
- **Nothing downstream asks for more.** `remoteCreate` (`remote-sessions.ts:1503`) and `listRemoteDir`
  (`dir-list.ts:186`) ask for nothing else, and neither asks `machineLinkAnswering`.
- **A quiet machine is still offered.** `confirmedMachines` offers a quiet machine
  (`src/renderer/state/machines-slice.ts:200-204`).

So, by reading, a create after an accepted Prepare that failed at an option row is reachable, and it starts the feed.
It was not driven, because that needs Electron.

His machine can therefore be any row from 3.2a up. 3.6 or newer is more likely, but only because the other route
means pressing on past a failure sentence. What 320.1 does for him depends on the row:
- **3.6a, 3.7b or 3.7c:** 320.1 reaches him as it stands.
- **3.6 (Ubuntu 26.04) or 3.6b (Debian 13 backports):** it reaches him after the build in §11 item 1.
- **3.2a to 3.5a:** it does not reach him until the later phase in §11 item 2.
- **A self-built tmux, or an unlisted string such as `3.7` or `3.7a`:** neither build reaches him.

Two commands would settle it:

```
tmux -V
cat /etc/os-release
```

Whether to ask him is the operator's call. Nothing was posted on issue 31.

## 6. What the attack killed

Each of these was upheld by the judge after an adversary or a second method refuted it, or after the judge's own
measurement, so no later round re-derives it.

1. **"Ubuntu 26.04 matches by string"** (the entry's table). It prints `3.6`, and both gates refuse it.
2. **"A person on a long-term-support release can accept the version and start sessions"** (the entry's first
   conclusion). Prepare fails at row 4 or row 10 on every one of them.
3. **"3.6a passes every check, so the harness is valid and 3.6a is sound"** (investigator A). The harness is valid.
   But 3.6a carries the handshake crash and the 5049 wedge, which no check A ran could see.
4. **"Linux uses libevent's epoll backend"** (investigator A). `osdep-linux.c:97` sets `EVENT_NOEPOLL` before the
   event base is made, so Linux tmux uses `poll`.
5. **"3.8-rc drops notifications the parser ignores"** (investigator A). `%sessions-changed` is a parser arm. Dropping
   it is harmless only because `%exit` follows it.
6. **"Rolling machines fall off both lists the day 3.8 ships"** (the entry, investigator A). They fall off at the far
   server's next restart.
7. **"Without a live connection no saved output is ever copied"** (the entry's table). The copy taken at End runs on
   the timer feed.
8. **"Admit by capability, probe once, cache per server"** (investigator B's option). The probe was byte-identical
   across a broken pair.
9. **"`set-option -q` makes Prepare tolerate old servers."** It rescues names, not values. `noattr` still fails.
10. **"Tortie's scroll draws tmux's position indicator on 3.2a to 3.5a whatever it does"** (investigators A and B).
    `copy-mode -e -H` hides it.
11. **"A never-greeting pair respawns every 0.5 s"** (the adversary's own harness). The product stops the client before
    the disconnect handler runs, and keeps the machine on the timer feed.
12. **"A dropped ssh channel can crash a 3.6-family server"** (the adversary, raised as open). Closed pipes ended it 0
    times in 1,000, and 760 of the children outlived the closure by 150 ms. What sshd really does on channel loss is
    still unmeasured (§8).
13. **"3.8-rc's `show-options` formats will break Prepare's read-back"** (investigator B, read). All 12 rows read back
    equal on 3.8-rc in both passes.
14. **"The reporter runs 3.6 or later"** (investigator A, medium). Narrowed to "more likely" (§5).
15. **"Add a pair gate for every version"** (investigator B's option, at full width). Wrong for servers at 3.6 and
    later, where it would refuse the rolling upgrade that works today.
16. **"Debian's NEWS warns about 3.7, so a 3.7 pair hangs."** The 3.7 paragraph reproduced on no pair. The 3.6
    paragraph is exact.
17. **"The client's first-in-first-out reply pairing and missing per-command deadline make old versions riskier"**
    (investigator B, read). They are properties of the shipping client on every version, the measured ones included.
    They belong to 320.1's P5, which has since landed at `b28d0eb4`, and to their own entry. They do not separate
    versions.
18. **"Linux systemd-tmpfiles could delete Tortie's far socket"** (the adversary, raised against itself). Refuted by
    reading: `tmpfiles.c:852-853` skips sockets listed in `/proc/net/unix`, and Debian has shipped `x /tmp/tmux-*`
    since 3.4-4 (bug 1070724).

## 7. The judge's rulings

| Question | Ruling |
| --- | --- |
| What does Ubuntu 26.04's tmux print? | `3.6`. A upheld, confirmed by the adversary on another architecture. B's and the entry's `3.6a` withdrawn |
| Can Prepare finish on 3.2a to 3.5a after an acceptance? | No. Row 4 on 3.2a, row 10 on 3.3a to 3.5a, row 11 refused too; the judge re-ran Debian 3.3a-3 |
| What is the reporter's tmux? | Any row from 3.2a up. 3.6 or later is likelier, not proven |
| Does the same-version control dialect separate old tmux from new? | No, on every check run. B's pairing and deadline risks are the client's on every version |
| What does an in-place upgrade leave? | A pair crossing 3.6 never greets and the attach exits at once; every other measured pair works |
| Does a never-greeting pair loop in the product? | No. One 10 s wait per run, then the timer feed |
| Can today's gates reach the 3.6 break? | No, but only because of which versions are listed. Both remote gates are server-only |
| Can Tortie reach the `control_stop` crash? | Not on its own path. The precheck is load-bearing and the build pins it |
| The 5049 wedge | A narrow defect of servers before 3.7, shared with the admitted 3.6a. Its own entry |
| Admit by capability? | Rejected |
| Tolerate old servers with `-q`? | `-q` alone refuted. Per-row fallbacks work except `allow-passthrough` on 3.2a |
| An acceptance on the control gate? | Rejected |
| A wider rule than byte equality? | Rejected |
| Do rolling machines fall off on the day 3.8 ships? | No, at the far server's restart. Measured on the release candidate |
| What does a machine without a live connection lose? | Only the periodic copy; the End copy still runs |
| B's defects in today's copy | Each upheld, each its own entry, none fixed here |
| 3.8-rc's `show-options` and Prepare's read-back | Refuted by measurement |
| Does the macOS stand-in say anything about a distribution's build? | Yes for every checked cell, with the patches named. No for the Linux-only paths, row by row (§8) |
| Second sources | Fedora dist-git closes 3.6, 3.6a and 3.6b. Fedora's 3.7b and 3.7c hashes differ from upstream's; recorded. 3.8-rc has none |
| Fedora's releases against its updates | Minor versions move inside a stable release within days of upstream; Fedora 43 crossed 3.6 in July |
| Ubuntu 25.10 | Not a supported row: Obsolete |
| Where does a pair read apply? | Before any pre-3.6 server is admitted. Not for 3.6 and later |
| The Debian 13 stuck state | Real today. Its own entry |
| 3.4's `$` and 3.2a's padded capture | Real, moot today, preconditions for any row for those versions |

Per version:

| Version | Final verdict |
| --- | --- |
| 3.2a (Ubuntu 22.04, Supported) | Stays off both lists. `allow-passthrough` has no fallback, `capture-pane -J` pads, and a pair read is needed first. Whether to support it at all is the operator's decision |
| 3.3a (Debian 12) | Off both lists until the boot and pair phase lands; then a candidate for both planes. The upgrade to its 3.5a backport works |
| 3.4 (Ubuntu 24.04) | Off both lists until the boot and pair phase and the `$` fix land. Its upgrade to 26.04 crosses 3.6 |
| 3.5a (Debian 13; bookworm-backports; Fedora 43 as released) | Off both lists until the boot and pair phase lands. Both its no-reboot upgrades cross 3.6 |
| 3.6 (Ubuntu 26.04, packaged as 3.6a-2ubuntu0.1) | **Add to both planes.** The subject says upstream 3.6, which Ubuntu 26.04 labels 3.6a, built on this Mac with Ubuntu's two patches applied, no Linux binary run; the note names the two 3.6-family defects |
| 3.6a (the measured row) | Stays, with its Homebrew subject. Its note gains the two defects; the first also applies to this Mac's local tested pair |
| 3.6b (Debian 13 backports) | **Add to both planes.** The subject names the upstream tarball, byte-equal to Fedora's hash, with Debian's `platform-quirks` patch applied |
| 3.7 and 3.7a | No row; nobody measured them. Fedora shipped 3.7 for a day or two in July 2026 |
| 3.7b (Ubuntu 26.10; bundled) | Stays |
| 3.7c (Debian testing, Fedora, Arch, Homebrew) | Stays. The one version on which none of the defects reproduce |
| 3.8-rc | No row. Add 3.8 when final, with the 3.7c-server pair |
| `next-3.8` (git builds) | No row is possible; the acceptance dead end is its own entry |

## 8. What stays unmeasured, and why

- **Any Linux binary, kernel or libc.** The stand-in holds for every cell checked, because those cells sit in code
  Linux compiles the same way: the option and style refusals, the 3.6 wire change, the `control_stop` crash and the
  5049 logic. These Linux-only paths were not run:
  - the `poll` event backend (`osdep-linux.c:97`);
  - jemalloc (Debian 3.5a and later);
  - utempter;
  - the `/proc` reads in `osdep-linux.c`;
  - `SO_PEERCRED` in the server's accept.

  Two differences from the builds here are also unmeasured:
  - **The systemd cgroup move at pane spawn.** Debian 3.4 and later, Fedora and Arch pass `--enable-systemd`. On 3.4
    and 3.5a the move runs in the server, bounded by a 1 s `sd_bus_call`. From 3.6 it runs in the pane's child, where
    `sd_bus_match_signal` runs synchronously with sd-bus's default timeout, so it can delay the pane program but not
    the greeting. That was read, not run.
  - **The character width tables.** The distributions build without utf8proc and use glibc's `wcwidth`. A built with
    utf8proc on and the adversary with it off, and the two agreed on every cell they both checked.
- **A real ssh hop and a real network.** ControlMaster framing, `ssh -t` pty allocation, `TERM` forwarding and far
  login rc files were not reproduced. **Whether a real ssh channel drop can kill a far control client inside its
  first 3 ms is not measured.** The judge's closed-pipe arm is a model of what sshd does. The adversary's orphan
  harness, which closed both pipe ends of a control child, left the client alive past 8 s for both a hung
  cross-3.6 pair and a same-version 3.7c pair. That says nothing version-specific, and node socketpairs may not match
  sshd (`adv/results/orphan-*.json`, inconclusive).
- **The reporter's machine.** Its version and distribution were not observed (§5).
- **Fedora's, Arch's and Homebrew on Linux's own binaries.** Their sources apply no patches, and their build flags
  match what Debian's buildd log shows, but none of the three was built or opened.
- **3.8 final, 3.7 and 3.7a.** 3.8 is not published. 3.7 and 3.7a were not built.
- **Fedora 43's July pair itself, 3.5a under a 3.7 program.** 3.5a under 3.7b was measured and hung.
- **The app.** Whether a create after a failed Prepare is reachable in the running app needs Electron, which this
  phase does not start. Every sentence quoted here was composed by the shipping functions, not drawn.
- **Other distributions:** RHEL and its rebuilds, Amazon Linux, Alpine, openSUSE and NixOS. Also any tmux before
  3.2a, including Ubuntu 20.04's 3.0a on ESM.

## 9. Found on the way, and not this phase

Each is its own entry, with its own tier. None is fixed here.

1. **A boot refusal reads as "could not reach".** A refused option is classed `unknown`, which draws "Tortie could
   not reach this machine, and it does not recognise the reason." about a machine Tortie reached, with the JSON
   payload as its detail.
2. **A version-refused machine reads as one that did not answer.** At launch it is marked quiet
   (`core.ts:1356-1362`) and drawn as "mybox did not answer the last time Tortie asked." (measured with the shipping
   `machineDetailSentence`). `noteMachineRefused` (`control-plane.ts:402`) has no production caller, although
   `src/shared/ipc/machines/presence.ts:34` says `refused` covers a machine that runs an unmeasured version. Every
   Ubuntu 22.04 or 24.04 and Debian 12 or 13 machine gets this sentence at every launch until it is accepted.
3. **The acceptance sheet promises two false things.** `MACHINE_VERSION_ACCEPT_OFFER` (`errors.ts:354-362`) says
   accepting "lets Tortie start sessions on this machine", which is false on 3.2a to 3.5a. It also says "If the
   program on it is updated, Tortie asks you again", which is false until the far server restarts, because Prepare
   compares the acceptance with the SERVER's version.
4. **A git build is offered an acceptance it cannot take.** A `next-3.8` server reads `unreadable` on the control
   gate, while `-V` parses and the sheet offers an acceptance. `machines:acceptVersion` then refuses it, because
   `MACHINE_VERSION_PATTERN` is `^[0-9][A-Za-z0-9.+-]{0,31}$` (`src/shared/machines.ts:106`, checked at
   `src/main/machines/ipc.ts:726`). Homebrew shows 103 `--HEAD` installs among 26,445 over 30 days.
5. **The Debian 13 stuck state** (§3.4). The fix belongs with the pair read's sentence.
6. **A server that restarts onto an unmeasured version costs one exec read per reconnect step, forever.** The
   precheck throws `INVALID_INPUT` on every reconnect, and `start()` reschedules itself, capped at 10 s, with no
   sentence drawn. Investigator B read this; it was not driven.
7. **The `control_stop` crash in tmux 3.6 to 3.6b** (§3.5). It is recorded, and the precheck is named as what stops
   the rolled-back-program route.
8. **The issue 5049 exit wedge** on servers before 3.7 (§3.5).
9. **A reconnect can start a fresh far server with tmux's defaults.** After a far server died, the adversary's
   harness, which had no precheck, ran `-C new-session -A -s gmux-control` and started a new server on the same
   socket (pid 81975, ended by the adversary). In the product the precheck should stop this, unless the server dies
   between the precheck and the spawn. It is the same class as research 130 §9 and belongs in that entry.
10. **3.4 stores `$` as `\$`, and 3.2a pads `capture-pane -J`.** Both are preconditions for any row for those
    versions.
11. **`build/probe-control-dialect.mjs` reads the operator's `-L gmux` server** before and after (`:126`), which is
    why this phase copied its steps rather than run it. The build in §11 cannot cite it for new rows until it stops
    doing that, or a probe that reads no server of his replaces it.
12. **`scroll.ts`'s `goto-line` latch can only latch on a real error.** A copy-mode command a server lacks exits 0
    and does nothing, so "the first attempt failed" never means "this verb is missing". `goto-line` exists at every
    tag from 3.2a. This is for 320.1's spec, beside research 130 §6 item 9.

## 10. What this round left behind

- **No server of this round is running.** At the end, a count of `tmux` processes on any `-L p322-` or `-L p83-`
  socket read 0, and no process was running from `scratchpad/p322`.
- **Every argv was recorded, and none named his servers.**

  | Harness | Argv recorded | Named `-L gmux` or `-L default` | Named no `-L` |
  | --- | --- | --- | --- |
  | Investigator A | 2,522 tmux argv (`A/logs/argv.log`) | 0 | 41, all `-V` reads |
  | Investigator B | 106 (`B/argv.jsonl`) | 0 | 0 |
  | The adversary | 3,650 (`adv/logs/argv.log`) | 0 | 0, apart from 4 `-V` reads in `build.sh` |
  | The judge | 6,543 (`judge/logs/argv.log`) | 0 | 0; every entry names a `p322-judge-*` socket |

  Nothing was installed, no ssh was run, no Electron was started, and pid 26677 was never signalled. `git status` in
  `/private/tmp/wt-p322` was clean before this document was written.
- **Servers the adversary's own harness left behind.** Its reconnect started pids 90604, 90795 and 81975. Each was
  confirmed as its own through `display-message` on its own `p322-adv-*` socket and ended by pid.
- **Socket files.** 162 dead `p322-*` socket files remain in `/private/tmp/tmux-501`, outside every researcher's
  write area. Every one answers "no server running".
- **Crash reports.** macOS wrote 19 `tmux-2026-09-23-*.ips` crash reports to `~/Library/Logs/DiagnosticReports`: 13
  for the adversary's scratch servers and 6 for the judge's. Each is an `EXC_BAD_ACCESS` SIGSEGV from the handshake
  race or the old-program route. Two were read for symbols. None was changed.
- **A stray file.** The adversary wrote one file, `/tmp/claude-501/x1`, outside scratch by mistake, and deleted it
  within the minute.
- **Observed and not touched.** Investigator A saw a `probe:controldeadline` run from `/private/tmp/wt-p320` on
  socket `gmux-p83-deadline-96825`, with tmux pids 97018 and 99673 reparented to 1 while its driver, pid 99723, was
  still alive. When this was written none of the three was running.
- **The evidence is in scratch, which does not survive a reboot.** That covers the 22 builds, the downloaded
  packages, the harnesses and every raw result under `scratchpad/p322/`.

## 11. What this queues

Named here, sized and tiered. None of these entries is written.

1. **The build: Ubuntu 26.04 LTS and Debian 13 backports join the live connection.** Tier 3, because it claims to
   work across machines and decides which machines 320.1 runs commands on. It is a `feat`, so a minor.
   - **The rows.** `3.6` and `3.6b` join `TESTED_REMOTE_TMUX_VERSIONS` with `measured: { exec: true, control: true }`
     and honest subjects (§7), and each note names the two 3.6-family defects. The existing 3.6a note gains the
     same.
   - **The pin.** One new rule, with an ablation, pins that the transport's precheck `display-message` runs before
     every spawn and every reconnect (`control-plane.ts:477-483`).
   - **The measurement the rows cite.** It has to come from a probe that reads no server of the operator's (§9 item
     11). `build/tmux-probe-versions.json` gains the two versions with their second sources.
   - **The verifier.** It re-runs §2.5's matrix for the two new strings and the three controls with a harness of its
     own, and the attack runs beside it: at least the 3.5a-server pair under both new programs, and the precheck
     ablated.
   - **The menus** do not change.
2. **Its own Tier 3 phase, after it: Debian 12 and 13 and Ubuntu 24.04 can hold a session.** For 3.3a, 3.4 and 3.5a:
   - a Prepare with named per-row fallbacks and `history-limit` first;
   - copy mode entered with `-H` for 320.1;
   - the `$` stamp fix for 3.4;
   - the program-beside-server read, with a true sentence for a pair across 3.6.

   3.2a stays refused unless the operator says otherwise.
3. **The defects in §9**, each as its own entry. Items 1 to 4 are copy and gate-outcome fixes a person reads at every
   launch. Item 5 belongs with phase 2's pair sentence. Item 9 joins research 130 §9's entry.
4. **3.8**, measured when it ships final, with the pair of a 3.7c server and a 3.8 program.

## 12. The rulings it needs from him

1. **"Let Ubuntu 26.04 LTS and Debian 13 with backports onto the live connection, and so onto 320.1's scrolling?"**
   The evidence is upstream 3.6 and 3.6b built on this Mac with those distributions' own patches applied. No Linux
   binary was run. Both share an upstream defect with the 3.6a admitted today: the far tmux server ends if the live
   connection's far process is killed with SIGKILL in its first 3 ms or so. Tortie never sends that signal, and
   hangups, terminations and dropped connections ended it 0 times in 4,000 tries. **Default:** yes. The build adds
   `3.6` and `3.6b` to both lists, with subjects that say "built on this Mac, distribution patches applied, no Linux
   binary run" and notes that name the defect.
2. **"Make Ubuntu 24.04, Debian 12 and Debian 13 able to hold a session at all?"** Today, accepting their version
   leads to a Prepare that fails. Fixing it means two things:
   - Tortie sets a plainer highlight colour on those machines;
   - Tortie checks the machine's tmux program against its running server, so a machine upgraded in place is told the
     truth instead of being offered a terminal that closes at once.

   Ubuntu 22.04 would still lack pass-through escapes, so images and similar reach the terminal there as nothing, and
   a session there cannot feel identical to a local one. **Default:** queue it as its own Tier 3 phase for 3.3a, 3.4
   and 3.5a after the 3.6 rows land, and leave Ubuntu 22.04 refused.
3. **"When a machine's tmux server is older than its tmux program, should Tortie only say so, or also offer to end
   that server when it holds no sessions?"** This happens when a machine is upgraded in place, as with Debian 13's
   backport or Fedora 43's July update. **Default:** say so in one sentence and end nothing, because Tortie never
   restarts, signals or upgrades a running server.
4. **"Ask the reporter of issue 31 to run `tmux -V` and `cat /etc/os-release`?"** His session proves only that his
   far tmux ran `new-session`. By reading, even Ubuntu 22.04 to Debian 13 could have got there after a failed
   Prepare. **Default:** do not ask, and post nothing on issue 31.
