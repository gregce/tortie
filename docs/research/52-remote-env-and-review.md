# Research 52. The environment byte path, and the read only review

**Measurement document. Written 2026-08-18, during Phase 73 (M6).** It answers one question research
51 left open, and it records what the read only review was measured doing. It rules on one thing:
whether Tortie may carry a value of a person's choosing to a session it starts on another machine.

**Note on the number.** Two documents already carry the number 52, being
`52-control-mode-dialect.md` and `52-unit-of-work.md`. The Phase 73 spec named this file, so the
name is kept rather than renumbered, and this line is here so a later reader is not left wondering.

**Provenance and safety.** Every number below was produced by `build/probe-remote-env.mjs` and
`build/probe-remote-review.mjs` on 2026-08-18, on the operator's Mac. In both probes the other
machine is a scratch sign in server on 127.0.0.1 on a high port, started by
`build/scratch-machine.mjs` and killed by recorded pid. **No machine of the operator's and no
tailnet host was contacted, and no Linux machine was contacted at any point.** The operator's own
tmux server was counted before and after every run and held 32 sessions both times. Nothing was
written under the person's `~/.ssh`. The only repository either probe touched is one it made under
`/tmp`.

---

## 0. The answer

**A value that must stay private cannot travel to a session on another machine, and Tortie will not
pretend otherwise on a platform it has not measured.** The value is one element of the argv of the
sign in program on this Mac, and the whole far side command is one element of that same argv. On the
far side the login shell splits that string and runs that machine's own program with the value in
ITS argv. So the bytes stand in two process tables at once for the life of the create.

So Phase 73 ships a refusal rather than a feature. `src/main/machines/remote-env.ts` allows exactly
two names, being `GMUX_MANAGED` and `GMUX_SESSION_ID`, which are the two Tortie already sends. Both
are identifiers Tortie made for its own bookkeeping, neither is a secret, and both are already
readable in a pane's environment on this Mac. Every other name is refused before anything is
composed, so a refusal means no process was started and no byte left this Mac.

---

## 1. The question, as research 51 section 7 row 4 wrote it

> Does a passthrough value transit the Mac process, the ssh argv, or remote `ps` output on the way
> to `new-session -e`?

`src/main/machines/remote-sessions.ts` has carried an optional `env` record on `remoteCreateArgs`
since Phase 70. Nothing in production has ever passed one. This is the measurement that decides
whether anything ever should.

---

## 2. The byte path, measured

The sentinel is `TORTIE-P73-<16 random hex>`, which appears nowhere else on this Mac. It is carried
as the VALUE of `GMUX_SESSION_ID`, so every byte below travelled the production path with nothing
bypassed and nothing composed by the probe.

| # | Point | How it was looked for | What was found |
| --- | --- | --- | --- |
| 1 | The argv Tortie composes on this Mac | Read from `tmuxCommand`, the one composer, and printed in full | HOLDS the value. 1 of 24 arguments carries it, and that argument also carries the whole far side command |
| 2 | This Mac's process table, while the create is in flight | `ps -Axww -o user=,comm=,args=` in a loop for the life of the create | 23 samples. The far side's own program held the value in 3 of them. The sign in program was on 11 sampled lines and held the value in NONE of them |
| 3 | What another account can read on this Mac | `ps -Axww -o user=,args=`, counting processes owned by other accounts and how many print more than their program path | 242 processes owned by other accounts. 66 of them printed more than their program path to this unprivileged account |
| 4 | The session environment after the create | `show-environment -t <id> GMUX_SESSION_ID` over the exec plane | `GMUX_SESSION_ID=TORTIE-P73-971636cb7595bcc2`. The value reached the session |

Three of those rows need a sentence of their own.

**Row 2, and why the zero is not the answer a reader expects.** The sign in program appeared on 11
sampled lines and none of them carried the value. The 11 are the reused connection's own master
process, which was started by the program search list capture and whose argv holds that command
rather than the create. The short lived client that carries the create hands its command to that
master and exits, and no sample caught it. The probe reports the count and does not guess further.
Row 1 is the direct evidence for this Mac: that argv is what `execFile` hands the process, so it is
the process's argv by construction.

**Row 3 is the row that decided the refusal, and it did not go the way the phase spec expected.**
The spec said macOS hides another account's arguments and proposed to cite that rather than measure
it. Measured, 66 of 242 processes owned by other accounts print more than their program path to an
unprivileged account on this Mac, e.g. `root /usr/sbin/systemstats --daemon`. This probe did not
determine the mechanism and does not claim one. What it establishes is narrower and enough: the
claim "another account cannot read this" is not true here as a blanket rule, so it cannot be leaned
on as one anywhere.

**Row 4 says the mechanism works.** A passthrough would do what a caller wanted. That is why the
refusal is a decision rather than a limitation.

---

## 3. The refusal, and why an unmeasured far side decides it

On Linux the ordinary default is that `/proc/<pid>/cmdline` is readable by every account on the
machine. **No Linux machine was measured here, and a machine row can name one.** So the choice was
between two answers:

| Option | Verdict | The deciding reason |
| --- | --- | --- |
| Open the `env` record to callers | REFUSED | Tortie would be putting a value on a command line whose readers it has never counted, on a computer it has never looked at |
| Allow the two names Tortie already sends, refuse the rest | TAKEN | Neither name is a secret, both are already visible in a pane's environment here, and the refusal costs nothing that exists today because no caller passes an `env` record |
| Send the value some other way, e.g. a file on the far side | NOT BUILT | It is a write to another person's disk for a value nobody has asked for yet. Phase 73 has exactly one write and it is the image upload |

The production change is therefore three lines: a list of two names, a check, and one call from
`remoteCreateArgs` before it appends anything. The refusal sentence is
`REMOTE_ENV_PASSTHROUGH_REFUSED` in `src/main/machines/remote-copy.ts`.

Measured with the probe: across a refusal the count of sign in processes on this Mac went 0 before,
0 after. Nothing is started and nothing is sent.

---

## 4. The read only review, measured

`build/probe-remote-review.mjs` made a repository under `/tmp` with one commit, then changed three
files in the three shapes a review has to draw: one modified, one added and staged, and one renamed
with `git mv`. It then asked Tortie for the review over a real connection to the scratch machine.

| What | How it was measured | Result |
| --- | --- | --- |
| The list | Compared against the repository's own state | 3 of 3 files, being `A added.txt`, `M kept.txt`, and `R renamed.txt` carrying `moved.txt` as its old path |
| Both sides of every file | sha256 of what Tortie read against `git show HEAD:<path>` and the file itself, run directly in that repository | 3 of 3 files identical on both sides |
| The rename | The committed side is read at the OLD path and the working side at the NEW one | `8c3140c27a75` on both sides, which is the file being unchanged in content and moved in name |
| Nothing was written, first half | The size and modification time of every file under `.git`, before and after | 28 files, all unchanged |
| Nothing was written, second half | `git status --porcelain` byte for byte, before and after | 53 bytes, identical |
| The connected only rule | The scratch sign in server stopped by its recorded pid, then the same review asked for again | Refused with `MACHINE_NOT_CONNECTED`. Sign in processes went 0 before, 0 after, so nothing was sent |

**One measurement had to be corrected, and it is worth recording because a later probe will hit it.**
On the first run the file `.git/index` moved its modification time across the review and its size did
not. That was not the review writing: git marks an entry "racily clean" when the file's modification
time equals the index's own, which is what happens when a probe writes three files and reads the
status inside the same second, and the next status rewrites the index to settle the race. The probe
now waits 1.2 s and settles twice before it takes the before reading. With that, three consecutive
runs reported 28 files unchanged.

---

## 5. What is NOT true, and what was not measured

- **No Linux far side exists in any of this.** In both probes the far side is this Mac. Row 2 of the
  byte path table is a macOS far side, and the refusal in section 3 is decided by the Linux case
  that nobody has looked at.
- **No machine of the operator's was contacted**, and no tailnet host.
- **The `ps` visibility rule was measured, not explained.** Section 2 row 3 counts what an
  unprivileged account can read on this Mac. It does not say why macOS answers that way, and a
  reader must not take the count as a rule about macOS in general.
- **The review's repository is two minutes old.** It is not a repository anybody works in, it has
  one commit, and it holds three files. A review of a repository with ten thousand changed files has
  not been measured, and `REMOTE_REVIEW_MAX_FILES` is 30 by choice rather than by measurement.
- **The caps are chosen, not measured.** 2 MB per side and 30 files per list are numbers somebody
  picked. What is measured is that a person is told when either bites.

---

## 6. The Linux store path patterns, owed from item 1

Research 51 section 7 question 9 priced this at one to two days on a real Linux box. There is no
Linux box in this phase. Six agents have a harvest descriptor in
`src/main/manifest/harvest/stores.ts`, and their roots on this Mac are these:

| Agent | Root on this Mac | Likely to carry over? |
| --- | --- | --- |
| codex | `$CODEX_HOME`, or `~/.codex/sessions` and `~/.codex/archived_sessions` | Home relative, so likely. Not measured |
| qwen | `~/.qwen/projects/<sanitized cwd>/chats` | Home relative, so likely. Not measured |
| muse | `$XDG_DATA_HOME/muse/sessions`, or `~/.local/share/muse/sessions` | The fallback is already the Linux convention, so likely. Not measured |
| deepseek | `~/.codewhale/sessions` and `~/.deepseek/sessions` | Home relative, so likely. Not measured |
| pi | `$PI_CODING_AGENT_SESSION_DIR`, or `$PI_CODING_AGENT_DIR/sessions`, or `~/.pi/agent/sessions` | Home relative, so likely. Not measured |
| antigravity | `~/.gemini/antigravity-cli/brain` | Home relative, so likely. Not measured |

**Likely is not measured, and this table is not evidence.** It is a list of what to check first on
the day a Linux machine exists. No table of thirteen agents times a platform nobody touched appears
in this phase.

---

## 7. How to repeat this

```
node build/probe-remote-env.mjs      # about 40 s. Starts one scratch sshd on 127.0.0.1:45741
node build/probe-remote-review.mjs   # about 60 s. Starts one scratch sshd on 127.0.0.1:45742
```

Both print every step, both kill only pids they recorded, and both refuse to run at all when the
tmux socket in play is `gmux` or `default`.
