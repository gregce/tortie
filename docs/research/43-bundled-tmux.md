# 43 · Bundling a pinned tmux, measured

**Research 43. Decision document. Written 2026-08-14.**

The question, from the operator. Should Tortie bundle a pinned tmux instead of requiring the
system one, weighing size and the change rate of tmux upstream, and centering the one hard
problem, which is that the server outlives the app on purpose.

Three lanes fed this document.

- An upstream lane measured the tmux release history, read the protocol source at every tag from
  1.9 through 3.7b, and ran a version mixing matrix on scratch sockets.
- A build lane compiled a portable tmux 3.7b on this machine, measured its size, signed it with
  the hardened runtime, and reproduced the mixing matrix with real tty attach.
- An integration lane mapped every place the repo touches tmux and pinned the minimum tmux
  version for every feature Tortie uses.

A judgment round weighed the options after all three lanes reported. Every number below was
measured on this machine (arm64, macOS 15.7.9) or read directly from upstream source, between
2026-08-12 and 2026-08-14.

**Safety.** No experiment touched the operator's server on socket `-L gmux` beyond read only
list-sessions and version reads. Every experiment server ran on a scratch socket named
`gmux-r43-*`. Every one was ended with kill-server and its socket file was removed. Zero r43
sockets remain in /private/tmp/tmux-501. All compile work happened in the scratchpad, never
inside the repo.

---

## 1. The answer

**Bundle a pinned tmux 3.7b as the third signed nested binary, and use only it in the packaged
app.** It lives at Contents/Resources/bin/tmux with the identifier com.itavero.tortie.tmux,
through the exact pipeline that already ships specstory and rg. Dev builds and the build
harnesses keep resolving a tmux from PATH through a dev branch in src/main/tmux/resolve.ts. That
is an environment fallback, not a user override, so no settings surface exists and Phase 23
refusal 8 does not apply.

The four reasons, each backed by a measurement below.

- A fresh Mac runs Tortie with zero prerequisites. Today it needs Homebrew first, and the boot
  screen tells the user to run "brew install tmux".
- The durability layer's version is chosen by the release instead of by a brew upgrade that swaps
  the binary under a warm server with no test and no warning.
- The cost is 1,456,032 bytes signed, which is 0.84 percent of the 172,577,508 byte DMG.
- The one hard problem shrinks to exactly one server and client pair per release, and that pair
  is testable in build/update-rehearsal.mjs before shipping. Today the pair is whatever brew last
  installed, and nobody tests it.

The rest of this document holds the evidence, the update lifecycle design, the adoption rule, the
pin policy, and what remains unverified.

## 2. Why the question exists

The private tmux server on socket `-L gmux` is the durability layer. Every session lives in it.
The app is a disposable client. Today the binary is whatever Homebrew installed. Three problems
follow.

- A fresh Mac cannot run Tortie without installing Homebrew and then tmux. The TmuxMissing boot
  screen carries the install command (src/renderer/app/EmptyStates.tsx lines 169 to 193).
- A routine brew upgrade replaces the binary under the product. The running server keeps its old
  bytes, and the new bytes take over silently at the next cold start. On this machine
  /opt/homebrew/bin/tmux is 3.6a while the current Homebrew formula is 3.7b, so the next brew
  upgrade crosses the exact 3.6 to 3.7 span this research measured.
- macOS attributes file access grants to the responsible process. A Homebrew tmux changes
  identity on every upgrade, so TCC grants can detach from it. A bundled signed tmux keeps one
  identity at one stable path (docs/FINAL-REPORT.md risk 1, and electron-builder.yml lines 211 to
  224 record the same reason for the specstory path).

The in-tree architecture authority already answered this question once. docs/FINAL-REPORT.md
section 1 describes sessions on "a private tmux 3.7b server (ISC, bundled inside gmux.app...)",
and Stream A1 at line 232 specifies the static build recipe. docs/research/09-reboot-survival.md
Appendix F holds the full shipping recipe. The deferral to system tmux is written into
src/main/tmux/supervisor.ts lines 22 to 24, src/main/attach/attach-host.ts lines 25 to 28 and
resources/gmux-tmux.conf lines 5 to 6. This document re-examines that early decision with
measurements rather than confirming it by habit.

## 3. The one hard problem, measured

The server outlives the app on purpose. A bundled tmux that updates with the app means the on
disk binary and the running server can disagree, and tmux has a reputation for refusing client
and server version mismatches. Both lanes measured what actually happens when versions mix.

### The mixing matrix

The two lanes built the matrix independently on scratch sockets. The upstream lane drove control
mode. The build lane drove real tty attach inside a pty. The rows agree.

| Server | Client | Control commands | Attach |
| --- | --- | --- | --- |
| 3.6a | 3.7b | every command tested works, exit 0 | works, real tty, pane content painted, the old server lists the client at 100x20 |
| 3.7b | 3.6a | every command tested works | works |
| 3.5a | 3.7b | work, exit 0 | fails. Real attach errors with "open terminal failed: not a terminal". Control mode attach hung until killed at 60 s |
| 3.7b | 3.5a | every command fails at once with "server exited unexpectedly" | no connection is ever made |

The commands exercised across the matrix, each on its own so a single failure could not hide.

- list-sessions
- display-message, including `#{version}` reads
- new-session
- send-keys
- capture-pane
- set-option and show-options on `@gmux-*` user options
- kill-session

Three findings follow.

- The pair a bundled Tortie actually creates in the wild (new client on disk, old running server,
  one release apart) works completely today, in both directions, including real attach. This is
  the exact 3.6a and 3.7b pair the first bundled release will meet.
- One framing generation apart (3.5a against 3.6 or newer), attach breaks in both directions. In
  one direction every command fails instantly and cleanly. In the other direction commands work
  but attach fails, and one measured failure shape is a hang rather than an error.
- In every experiment the running server was unharmed. After a 3.5a client failed against a 3.7b
  server, a 3.7b client could still list the sessions and the panes were intact. A mismatched
  client never killed, corrupted or altered a running server in any test.

### The root cause, from source and server logs

The famous refusal never fired. PROTOCOL_VERSION is 8 in both 3.5a and 3.7b, and tmux-protocol.h
is byte identical between the two releases (diff exit 0). So the well known message "protocol
version mismatch (client N, server M)" is not the hazard here. The hazard has no version number
attached to it.

tmux processes talk over a unix socket using a message framing library called imsg, which tmux
copies from OpenBSD into compat/imsg.c. tmux 3.6 imported a rewritten imsg (file version 1.23 to
1.42, commits 990c724b, 252f4181 and cbb3c4bf, landed between 2024-11-22 and 2025-06-24, shipped
2025-11-26 in 3.6). The rewrite changed the message header.

- The old header has five fields, among them a 16 bit length and a 16 bit flags field. A passed
  file descriptor, e.g. the client's terminal, is marked by a flag bit.
- The new header merges length and flags into one 32 bit length, and marks a passed file
  descriptor with the top bit of that length.

Both failure directions follow directly from that change.

- An old client's file descriptor message (length 16, flags 1) parses on a new server as length
  0x00010010, which is 65,552 bytes and over the 16,384 byte limit. The parse returns ERANGE and
  the server drops the connection without a message. The build lane's verbose 3.7b server log
  shows the 3.5a client lost immediately after MSG_IDENTIFY_CWD, exactly where the first file
  descriptor message arrives. The client sees only "server exited unexpectedly".
- A new client's file descriptor message reads on an old server as length 16 with an unknown
  flags value and no descriptor mark, so the terminal never reaches the server. Control commands
  work because they carry no descriptor. Attach fails with "open terminal failed: not a
  terminal", or hangs.

The maintainer described the same shape in issue 4890. "tmux already shows an error if the
protocol version is increased... but in this case it wouldn't have done any good because the
underlying protocol changed outside of tmux."

### What the built in version check does and does not cover

- Every message carries the sender's protocol version in the low byte of the imsg peerid.
  peer_check_version in proc.c runs on both sides. On a difference, the receiver sends
  MSG_VERSION back and the client prints "protocol version mismatch (client %d, server %u)" and
  exits 1. The refusal is symmetric and clean, but only when the number differs.
- The number has not differed since 2014. PROTOCOL_VERSION went to 8 in commit d66cbf20 on
  2013-10-06, released in tmux 1.9 on 2014-02-20, and is 8 at every tag through 3.7b. The
  upstream lane read the value at each tag in source. It has been stable for 12.9 years.
- The server ignores unknown message types silently. The dispatch switch in server-client.c has
  no default case, so an unknown type falls through without an error and without a crash.
- Message numbers between 3.0 and 3.7b changed only additively, inside anchored blocks. Four new
  identify messages were appended, and the old stdin and stdout messages were renamed with their
  wire numbers preserved. Since commit 44dad918 (2020-01-29) a client that receives one of the
  old messages prints "server version is too old for client" and exits.
- Upstream promises nothing about mixing. The maintainer wrote in issue 2706, "You cannot mix
  tmux versions, you must restart tmux entirely after upgrading", and also, "We can stop
  different versions communicating entirely but if we do that people complain." The 3.x era holds
  two real breaks inside protocol 8. Issue 2706 records a 3.2 client hanging against a 3.1 server
  when output is redirected, closed as unsupported. Issue 4890 records the 3.6 break measured
  above.

### The design consequence

The brief's rule is right and it needs one refinement. Adopting a new binary only at server cold
start, and never touching a running server, is necessary. It is not sufficient on its own,
because a newer client against an older server can hang on attach rather than error. So the app
must read the running server's version before the first attach and gate on it. That version read
worked across every measured boundary in the client newer direction, including a 3.7b client
reading `#{version}` from a 3.5a server. In the client older direction the failure is instant and
clean, and it cannot occur under the adoption rule below, because the shipped client is never
older than a server the shipped app started.

## 4. Upstream change rate

### Release cadence

Source is api.github.com/repos/tmux/tmux/releases. Tarball upload dates are used where GitHub's
tag, publish and upload dates disagree. The 3.0 and 3.1 era carries up to 2 months of date
ambiguity, and the conclusions hold under any of the three readings.

| Release | Date | Release | Date |
| --- | --- | --- | --- |
| 3.0 | 2019-11-26 | 3.4 | 2024-02-13 |
| 3.0a | 2019-12-01 | 3.5 | 2024-09-27 |
| 3.1 | 2020-04-24 | 3.5a | 2024-10-05 |
| 3.1a | 2020-04-29 | 3.6 | 2025-11-26 |
| 3.1b | 2020-05-04 | 3.6a | 2025-12-05 |
| 3.1c | 2020-10-30 | 3.6b | 2026-05-20 |
| 3.2 | 2021-04-13 | 3.7 | 2026-06-26 |
| 3.2a | 2021-06-10 | 3.7a | 2026-07-01 |
| 3.3 | 2022-06-01 | 3.7b | 2026-07-01 |
| 3.3a | 2022-06-09 | | |

- 19 releases in 6.6 years, which is 2.9 per year counting letter releases.
- Feature releases alone (3.0 through 3.7) average one every 343 days, about 1.1 per year.
- 2023 had zero releases. The gap from 3.5 to 3.6 was 425 days, and from 3.6 to 3.7 was 212 days.
- Letter releases are bug fix follow ups that land between the same week and the same month. 3.7a
  came 5 days after 3.7, and 3.7b came about 13 hours after 3.7a.

The maintenance burden of a pin is therefore about one deliberate re-pin per year, and no re-pin
is ever forced by upstream.

## 5. The build and its size

The build lane compiled tmux 3.7b from the release tarball on this machine. Each package built in
under two minutes with make -j8, observed from command turnaround rather than timed.

The recipe has four parts:

- the tmux 3.7b tarball, SHA-256 87f2e99e3b685973f2ca002ffd6ed7e51a5744f7009daae5a15670b6d532db96
- libevent 2.1.12-stable compiled static with --disable-shared --enable-static --disable-openssl,
  SHA-256 92e6de1be9ec176428fd2367677e61ceffc2ee1cb119035037a27d346b0403bb
- utf8proc 2.10.0 linked as a static archive, with tmux configured --enable-utf8proc
- Apple's SDK ncurses through LIBNCURSES_LIBS='-lncurses', so no ncurses is bundled

One macOS fact belongs in the record. tmux's configure stops with an error on macOS unless it is
given an explicit --enable-utf8proc or --disable-utf8proc, because Apple's libc wide character
tables are outdated. The Homebrew formula builds with utf8proc, and a shipping build should too,
for correct emoji and wide character widths. That width consequence comes from configure's own
warning and from Homebrew's dependency choice. It was not measured here.

otool -L on the result shows only three libraries, all OS provided on every macOS install:

- /usr/lib/libncurses.5.4.dylib
- /usr/lib/libSystem.B.dylib
- /usr/lib/libresolv.9.dylib

A fully static executable is not possible on macOS, because libSystem is always dynamic. Research
09 F.1 already records this.

| Measurement | Bytes |
| --- | --- |
| raw binary | 1,567,064 |
| stripped | 1,437,920 |
| signed, ad hoc, hardened runtime, com.itavero.tortie.tmux | 1,456,032 |
| zip -9 of the signed binary | 563,855 |
| the DMG today, release/Tortie-0.19.1-arm64.dmg | 172,577,508 |
| share of the DMG, uncompressed | 0.84 percent |
| add to the updater ZIP, from the zip -9 proxy | about 0.33 percent |

For scale, the bundled specstory is 43,189,586 bytes. The tmux addition is 3.4 percent of what
specstory already costs. Size does not decide this question. The brief's 170 MB figure measures
as 172,577,508 bytes in release/, and the percentages above use the measured number.

Proof it runs. On scratch socket gmux-r43-lab with the repo's resources/gmux-tmux.conf, the
stripped binary did all of the following.

- It started a server whose `#{version}` read back 3.7b.
- It created 3 sessions, then set and read back a `@gmux-test` session option.
- It returned pane text through capture-pane.
- It applied the conf exactly, e.g. history-limit read back 25000.
- Its kill-server exited 0 and the socket was confirmed dead.

Signing. codesign with --options runtime and the identifier com.itavero.tortie.tmux succeeded,
verification passes, and the flags read 0x10002(adhoc,runtime). Signing added 18,112 bytes over
the stripped binary. The signed binary then ran a real server under the repo conf and killed it
cleanly, so the hardened runtime does not break tmux. Research 09 F.3 records that tmux needs
zero entitlements.

Only arm64 was built. A universal binary is estimated near 2.9 MB raw, about 1.7 percent of the
DMG. That is an estimate, not a measurement.

## 6. What Tortie needs from tmux

The integration lane pinned every feature Tortie uses against the upstream CHANGES file (local
copy at /opt/homebrew/Cellar/tmux/3.6a/CHANGES).

| What Tortie uses | Minimum tmux | Where |
| --- | --- | --- |
| copy-mode-position-format "" | 3.6 | gmux-tmux.conf line 42, re-asserted warn only each boot |
| allow-passthrough on | 3.3 as an option, always on before 3.3 | conf |
| new-session -e, the GMUX_MANAGED and GMUX_SESSION_ID stamps | 3.2 | sessions.ts lines 176 to 178, hard error on failure |
| remain-on-exit failed | 3.2 | conf, exit code truth |
| extended-keys on | 3.2 | conf |
| refresh-client -f no-output | 3.2, renamed from -F | control client |
| exit-empty off | 2.7 | conf, keeps an empty server alive |
| control mode session notifications | 2.5 | control client |
| send-keys -X -N | 2.4 | copy mode driving |
| the #{version} format | 2.4 | the version probe below |
| pane formats such as scroll_position | 2.2 | activity/panes.ts, tmux/scroll.ts |
| = exact match session targets | 2.1 | all addressing |
| copy-mode -e | 2.1 | scrolling |
| mouse | 2.1 | conf |
| send-keys -l | 1.7 | literal keystrokes |
| history-limit | 0.9 | conf, 25000 |

Three facts fall out of the table.

- The hard floor is 3.2. Every session create passes new-session -e for the identity stamps, and
  a failed create is a hard error, not a degraded one.
- The newest requirement is 3.6, the copy-mode-position-format option. Between 3.2 and 3.6 the
  app boots, but scrolling paints tmux's own position box over the transcript, because the boot
  time re-assert of server options is warn only (src/main/sessions/core.ts lines 348 to 356).
- DEVELOPMENT.md line 31 already requires "system tmux (3.6+ via Homebrew)". The product already
  needs a tmux newer than most machines carry. Bundling removes a requirement rather than adding
  one.

A pinned 3.7b gives a 4 version margin over the hard floor.

## 7. How the repo is already shaped for this

The change is small because the repo funnels every tmux decision through a few known points.

- One module answers where tmux is. findTmuxBinary in src/main/tmux/resolve.ts (lines 346 to 356)
  probes the two Homebrew paths and /usr/bin/tmux, then PATH. It has exactly two consumers, the
  supervisor's getTmuxContext and the attach host, and GmuxCore hands the supervisor's resolved
  path to the attach host once per boot (sessions/core.ts lines 610 to 612).
- There are exactly three tmux spawn sites in the app. execTmux uses execFile at supervisor.ts
  line 494. The control client spawns at control-client.ts line 115. The attach host spawns under
  node-pty at attach-host.ts line 179. All three take the path from the one resolve module, so
  switching the packaged app to a bundled binary is one change.
- No code anywhere parses a tmux version. There is no tmux -V call in src/ or build/. Version
  knowledge lives only in comments today.
- classifyTmuxFailure (src/main/tmux/errors.ts lines 16 to 39) has no pattern for a version
  refusal. The strings "protocol version mismatch" and "server version is too old for client"
  exist in the shipped tmux binary and would surface as UNKNOWN with raw stderr today.
- Nothing durable records the tmux binary path. The manifest stores tmux_name and tmux_id only,
  and absolute paths only for agent argv. Every boot resolves tmux fresh, so a bundled path
  needs no migration.
- The nested binary pipeline is complete precedent, with a pin file carrying two hashes
  (build/specstory-release.json), extraResources into Resources/bin, a NESTED_BINARIES row
  (build/sign-nested-binaries.cjs lines 61 to 68), a signIgnore row (electron-builder.yml lines
  322 to 324), and verify-signed.mjs check 5 enforcing identity, team, hardened runtime and
  strict verification per row. Bundling tmux adds a third row to a pipeline that is already
  checked on every build.
- The cold start adoption rule needs no new mechanism. ensureServer is idempotent, the conf
  applies only when the server is actually created (measured block, supervisor.ts lines 121 to
  146), isServerRunning already distinguishes warm from cold, and boot time option re-asserts
  are warn only.
- The scroll layer already codes for an older server. scroll.ts keeps a chunked fallback "for
  any tmux without the goto-line verb". It is the one existing example of version tolerance.

## 8. The update lifecycle

Squirrel swaps the .app in place. The path string Contents/Resources/bin/tmux survives the update
while the inode behind it dies. The running server and any live attach clients keep their deleted
inodes and are untouched. Only new spawns get the new bytes. The picture at each moment.

```
before the update            after the Squirrel swap           after the next reboot
app 0.19, client 3.6a        app 0.20, client 3.7b             app 0.20, client 3.7b
       |                            |                                  |
       v                            v                                  v
server 3.6a running          server 3.6a still running          server 3.7b, created by
on -L gmux                   on its deleted inode,              ensureServer at cold start,
                             never touched                     conf applied once
```

This client newer than server skew is not created by bundling. It happens today whenever brew
upgrades tmux under a warm server, at whatever version distance brew chooses, tested by nobody.
Bundling shrinks the skew to exactly one pair per release, the previous pin as the running server
and the new binary as the client, and update-rehearsal.mjs already drives a real Squirrel update
and asserts that the tmux server still holds every session after the swap. It is the natural home
for the one interop assertion that matters, including real attach.

## 9. The options

| Option | Verdict | Deciding reason |
| --- | --- | --- |
| A. Always bundled, dev PATH fallback | **Recommended** | Version invariance for the durability layer at 1,456,032 bytes, exactly one server and client pair per release, and that pair is tested in update-rehearsal.mjs before shipping. |
| B. Bundled by default, user override to system tmux | Rejected | The override reintroduces the uncontrolled skew that bundling removes, and it serves no user need, because the private server is invisible to the user. It would also add a settings surface for an execution bearing path, which Phase 23 refusal 8 exists to prevent. |
| C. System tmux when in range, bundled fallback | Rejected | Keeps the brew upgrade skew as the normal case and doubles the tested surface, because every release must work against an open set of system versions and the bundled one. |
| D. System tmux with a version gate | Rejected | Keeps the fresh Mac Homebrew requirement, which is the original complaint, and lets a routine brew upgrade lock the user out of their own live sessions at the next cold boot. |
| E. Do nothing | Rejected | A fresh Mac cannot run Tortie without Homebrew, and the measured 3.5 to 3.6 wire break shows an upgrade can silently break attach under the product. |

Precedent went into the same weighing.

| Product | What it bundles | Relevance |
| --- | --- | --- |
| VS Code | ripgrep, hash pinned per platform, no postinstall network access | the pin file shape |
| GitHub Desktop | a whole git built for embedding, with no system library linkage | a daemon adjacent CLI inside a signed app |
| Postgres.app | an entire PostgreSQL server, Developer ID signed and notarized | a daemonizing server binary ships fine |
| Tortie itself | specstory and rg as signed nested binaries, checked by verify-signed.mjs | the pipeline already exists in this tree |
| iTerm2 | nothing. It drives the user's own tmux and carries 1.8 to 3.7 compatibility code | the counter precedent, and the cost of not bundling |

No shipped product was found that bundles tmux itself. Tortie would be first there, while
standing on a common pattern for nested signed CLIs. The searches for Zed and Warp found no
evidence either way and are listed under section 11.

## 10. The recommendation in full

Pin tmux 3.7b. Build it from the pinned tarball with static libevent and static utf8proc against
Apple's SDK ncurses. Ship it at Contents/Resources/bin/tmux as com.itavero.tortie.tmux, as the
third NESTED_BINARIES row. The packaged app uses only this binary. Dev builds and the harnesses
keep PATH resolution through a dev branch in resolve.ts, the same shape resolveConfPath already
has.

### The adoption rule

- Every tmux spawn in the packaged app uses the bundled binary. All three spawn sites already
  take the path from the one resolve module, so this is one change.
- A new bundled version becomes the server version only when ensureServer finds no server on
  socket `-L gmux` and creates one. In practice that means after a reboot, because exit-empty is
  off. The app never restarts or reconfigures a running server. Squirrel swaps the .app in
  place, and the running server keeps its deleted inode.
- On every boot that finds a warm server, the supervisor reads `display-message -p '#{version}'`
  with a timeout before the first attach, because the measured failure shape across a broken
  boundary can be a hang rather than an error. Three outcomes follow.
  - The version equals the bundled version. The user sees nothing.
  - The version differs but the pair is the release's tested pair. Each release tests exactly
    one pair in update-rehearsal.mjs, the previous pin as the running server with the new binary
    as the client, including real attach. The user sees nothing. One log line records the pair,
    matching the existing conf read back pattern (supervisor.ts lines 343 to 363).
  - The version differs and the pair is untested. The app does not attach. It shows a boot
    screen naming both versions and offering the manifest restore path, meaning a cold server
    start under the new binary with sessions re-created and agents resumed. The app never kills
    the old server itself. The user chooses.
- classifyTmuxFailure gains patterns for "protocol version mismatch" and "server version is too
  old for client". Both strings exist in the binary today and are unclassified.
- If a future re-pin ever fails the rehearsal pair the way 3.5 to 3.6 did, that release also
  ships the previous binary as tmux-prev, and the attach host uses it against warm servers at
  the old version until cold start. Postgres.app keeps prior versions the same way under
  Contents/Versions. Do not build tmux-prev now. Build it only when a rehearsal failure forces
  it.

### The pin policy

Pin 3.7b first. It is the latest stable, docs/FINAL-REPORT.md planned it from day one, the build
lane already built and measured it, and its pair with the fleet's current 3.6a servers is
measured working in both directions including real attach.

A re-pin happens when any one of these is true:

- upstream fixes a bug that affects Tortie
- upstream ships a feature Tortie will use
- upstream ships a security fix
- the pin has fallen 2 or more feature releases behind, which keeps the rehearsal pair adjacent

A new upstream release is not by itself a trigger. Letter releases of the pinned minor adopt
after the rehearsal pair passes. Every re-pin runs the full conformance battery plus the
rehearsal pair before shipping.

### Licenses

The obligations are notice reproduction only, in the acknowledgements surface:

- tmux, ISC. The only obligation is to reproduce the copyright and permission notice.
- libevent, BSD 3 clause. Binary redistribution must reproduce the notice, the condition list
  and the disclaimer in the distribution's documentation or other materials.
- utf8proc, MIT plus the Unicode data notice.

No source offer, no NOTICE file requirement and no advertising clause exists in any of the
three. ncurses comes from Apple's SDK and is not bundled. If a later build ever bundles ncurses,
its MIT and X11 style notice joins the list.

### Terminfo

resources/gmux-tmux.conf line 70 sets default-terminal to tmux-256color, so programs inside
panes need that entry in a terminfo database on the machine. The entry is present on this
machine at /usr/share/terminfo/74/tmux-256color, and research 09 F.2 records that macOS 14 and
later ship it. For macOS 13 and earlier, compile the entry with /usr/bin/tic -x into
Contents/Resources/terminfo and start the server with TERMINFO_DIRS pointing at the bundled
directory first and /usr/share/terminfo second. When the entry is missing, programs inside panes
fail to initialize curses with "missing or unsuitable terminal". The outward direction needs no
action, because the attaching client presents xterm-256color, which every macOS database has.

### The Phase 23 reading

Refusal 6 says no third party native code inside the signed bundle. Its stated rationale is code
loaded into Tortie processes, which would need the disable-library-validation entitlement app
wide and permanently. A nested, separately signed executable spawned as its own process is a
different thing, and it is already the shape of specstory and rg, both third party binaries
signed as com.itavero.tortie.* inside the bundle today. tmux needs zero entitlements. The build
phase proposal must state this reading explicitly rather than assume it, and this document
records the reading without deciding it.

The userData alternative, a copy per version under the app's data directory, was rejected on the
same Phase 23 logic. It would execute durability critical bytes from a directory every agent can
write. The signed bundle keeps the executed bytes the notarized ones.

### The verification tier for the build phase

Tier 3, because this touches the tmux layer, restore and session lifecycle, which the tier rules
name explicitly. The required evidence:

- the rehearsal pair in update-rehearsal.mjs with real attach, previous pin as server and new
  binary as client
- the untested pair boot screen driven live against a scratch server at an untested version
- npm run conformance:resume:capture if any restore path is touched
- verify-signed.mjs green with the third row
- a live check that the version probe answers on a warm server holding zero sessions, because
  that state is reachable under exit-empty off and the probe was verified only with a session
  present

## 11. What is not true or not verified

- No shipped product bundles tmux today. Tortie would be first. The nested CLI pattern itself
  is well precedented.
- iTerm2 not bundling tmux rests on its documentation and on research 09 Appendix F. No
  iTerm2.app bundle was inspected, because it is not installed on this machine. The same is true
  of GitHub Desktop and the dugite git.
- Zed and Warp were not resolved either way. To current knowledge neither bundles tmux and Zed
  has no tmux integration, but the search budget ran out before this was verified.
- Only arm64 was built and measured. The x86_64 and universal figures are estimates.
- Only ad hoc signing was exercised. Developer ID signing plus notarization of the nested tmux
  rests on the specstory and rg precedent, not on a new proof.
- Nothing guarantees 3.8 keeps wire compatibility with 3.7b. Upstream promises nothing, and it
  broke compatibility once inside protocol 8 with no number bump. The rehearsal pair gate exists
  for exactly this reason.
- The claim that the 3.5 to 3.6 break was caused by the imsg rewrite is established here by the
  header struct diff and the verbose server logs. The maintainer did not name imsg in issue
  4890.
- The mixing matrix covers 3.5a, 3.6a and 3.7b on one arm64 Mac. Older servers, e.g. a 2.9 era
  one, were not exercised.
- The 3.1 and 3.2 redirected output hang from issue 2706 was not reproduced locally. A
  different hang shape was measured at the 3.5a and 3.7b boundary.
- The width correctness consequence of building without utf8proc comes from configure's warning
  and Homebrew's dependency choice. It was not measured.
- Whether `display-message -p '#{version}'` answers on a warm server holding zero sessions is
  unverified. The build phase must check it.
- Whether an unknown conf option on an older tmux leaves the rest of the conf applied is
  believed per line but was not tested, because only 3.6a was available as a system binary.
- macOS 13 and earlier lacking the tmux-256color entry comes from gpanders' guide and research
  09 F.2. Presence was verified only on macOS 15.7.9.
- The minimum version for the pane_dead_signal format is inferred as 3.2 from a CHANGES entry
  that does not name it.
- The code comment claiming tmux 3.4 and later accept new-session's command as an argument
  vector (sessions.ts line 181) has no matching CHANGES entry and was not tested on an older
  binary.
- The DMG's own growth under its compression was not measured. The zip -9 figure of 563,855
  bytes is the closest measured proxy.
- Release dates in the 3.0 and 3.1 era carry up to 2 months of ambiguity between GitHub's three
  date fields.
- Build wall time was observed, not timed.

## 12. Sources and artifacts

In tree:

- /Users/gdc/gmux/src/main/tmux/resolve.ts, supervisor.ts, errors.ts, sessions.ts, scroll.ts
- /Users/gdc/gmux/src/main/sessions/core.ts and src/main/attach/attach-host.ts
- /Users/gdc/gmux/build/sign-nested-binaries.cjs, verify-signed.mjs, specstory-release.json,
  update-rehearsal.mjs
- /Users/gdc/gmux/docs/research/09-reboot-survival.md Appendix F, the shipping recipe
- /Users/gdc/gmux/docs/FINAL-REPORT.md sections 1 and 5, Stream A1, risk 1
- /Users/gdc/gmux/resources/gmux-tmux.conf lines 5 to 6, 42 and 70

Upstream:

- github.com/tmux/tmux, releases and source at every tag from 1.5 through 3.7b
- issues 2706, 4890, 2189 and 3143
- commits d66cbf20 (protocol 7 to 8), 13a0da20 (protocol header split), 44dad918 (old message
  refusal), 990c724b, 252f4181 and cbb3c4bf (the imsg rewrite shipped in 3.6), f0635717 (the
  2009 statement of the versioning design)
- formulae.brew.sh/api/formula/tmux.json, github.com/microsoft/vscode-ripgrep,
  github.com/desktop/dugite-native, iterm2.com/documentation-tmux-integration.html, and
  gpanders.com/blog/the-definitive-guide-to-using-tmux-256color-on-macos/

Lab artifacts, in the scratchpad at
/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad:

- r43/out/ holds tmux-3.7b-raw, tmux-3.7b-stripped and tmux-3.7b-adhoc with their zips
- r43/out/slogs/ and r43/out/dlogs/ hold the verbose server and client logs proving the
  mismatch mechanism
- build/tmux-r43up/tmux and build/tmux-3.5a/tmux are the upstream lane's builds, and
  build/deps-libevent/lib/libevent_core.a is the static libevent

Scratch sockets used and destroyed, with none remaining: gmux-r43-lab, gmux-r43-mix,
gmux-r43-rev, gmux-r43-x35, gmux-r43-x37, gmux-r43-x5, gmux-r43-x6, gmux-r43-x7, gmux-r43-mm1
through mm8, gmux-r43-host through host3, gmux-r43-t1 through t3, gmux-r43-sign, gmux-r43-proto
and gmux-r43-ver.
