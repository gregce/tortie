# What the verifiers found across fifty phases, and how each was fixed

Written 2026-09-03 at the operator's request. This document reads the fifty most recent phases that landed on `main` and, for each one, says what the phase was, what the independent verifier found, how it found it, and how and why the finding was fixed. It is written in plain language on purpose. Short sentences. Every hash is a commit on `origin/main`, checked with `git cat-file -e` on the day of writing, except one that lives in the website checkout and is marked as such.

**The count.** Of the fifty phases, **33 had a verifier finding that was fixed**, either inside the phase or in a later phase named in the section. **17 had no verifier finding that led to a fix**, and for each of those the last section says what the verifier did instead, so "nothing found" can be told apart from "nothing looked for". A final section lists the things verifiers found that are still not fixed, so nothing is quietly lost.

**The fifty, in the order they landed.** 168, 169, 169.1, 169.3, 170, 171, 174, 172, 176, 177, 173, 183, 178, 179, 180, 184, 175, 175.1, 181, 174.1, 181.1, 181.2, 185, 186, 187, 188, 189, 182, 174.2, 192, 193, 188.1, 191, 194, 200, 202, 190, 201, 195, 196, 198, 197, 199, 203, 204, 206, 205, 208, 207 and 209. Phases 210 and 211 were still in flight when this was written and are not here.

**Where this was read from.** The running log at the end of the backlog, the commit messages on `main`, the workflow journals of every run across both sessions, the earlier audit `docs/audits/2026-09-01-verification-findings-aug30-sep1.md` (which counts findings by method rather than by phase and is not repeated here), and the gate paragraphs in `CLAUDE.md`.

**How verifiers work here, in plain words.** Every phase is built by one set of agents and then checked by a separate verifier that must do at least one thing the builder did not. The five methods named throughout are:

- **Attack.** Try to break the claim instead of confirming it. Feed the feature the case the builder did not try.
- **Re-derive by another route.** Work out the same number or answer a second way, with code the builder never saw, and compare.
- **Hostile fixture.** Write test inputs designed to break the parser, the renderer or the gate.
- **Run over real data.** Drive the real binary, the real repository or the operator's own files, read only.
- **Measure the parent commit.** Run the same instrument on the code as it was just before the phase, so a fix is proved as a number that moved.

Plus **the one app run**: launch the real app once and drive every claim in that one session.

A few words used below: a **gate** is a check that runs at commit or build time and fails loudly. A **probe** is a script that launches the real app and reads it. A **fixture** is a made up input for a test. The **keychain** is where macOS keeps passwords. A **symbolic link** is a file that points somewhere else.

## The table

| Phase | What it was | What the verifier found | Method | Fix |
| --- | --- | --- | --- | --- |
| 169 | Oh My Pi becomes a supported agent | The resume test never reached a turn; a fresh omp sits on its own setup wizard | Real data | `d0e80a2` |
| 170 | Diagnostics reads every process, sorts, goes live | Live mode cost a whole CPU core; two figures still read "not read"; Capture during live gave a 24 ms report | Attack, real data | `c01c013` |
| 172 | The Architecture domain gets inner seams | An existing Architecture probe had been red for weeks and could never pass | Parent measurement | `e022194` (Phase 197) |
| 176 | The Architecture map is clickable again | A drill animation waits for a frame that never fires in a covered window | Own instrument | `29bc449` (Phase 197) |
| 177 | A file Tortie cannot read is ignored quietly | A file holding only the word `null` vanished with no line at all | Hostile fixture, parent measurement | `f2e9a12` |
| 173 | The remote fault matrix is adjudicated | The commit said typecheck was green; from a clean cache it was red | Attack | `4b8427b` |
| 178 | The Architecture face reads honest and thin | A label said "evidence checks" over nine checks that were not evidence; the commit body's file counts were wrong | Attack, re-derivation | `f7c0f3d` |
| 180 | Swift, Kotlin and Objective-C imports | A broken promise crossed by 33 Swift imports printed as kept | Attack | `5a75b54` |
| 184 | Java, PHP, C, C++ and C sharp imports | Six ways a repository's own code was called somebody else's, each turning a broken promise green | All five | `a2df598` and five more |
| 175 | Architecture behind a switch | An open map tab survived the switch being turned off | Attack | `860d8a2` |
| 181 | The usage meter | Turning the meter on drew nothing for fifteen minutes; off left the numbers up | Attack | `cf08930` |
| 174.1 | The font field holds still and suggests | The suggestion list offered two fonts and then said they were not installed | Attack, parent measurement | `84a8b6c` |
| 181.1 | The meter gives way to the tabs | The smallest meter still wore the left rail's styling and drew wrong in the tab strip; the probe could not fail | Re-derivation, parent measurement | `ed977d0` |
| 181.2 | The bar tracks a chosen window | No version bump for a new setting; neither fix had a guard that could fail; a claim about the plan word gate was wrong twice | Re-derivation, parent measurement | `7b3d2e3`, `d620d5c` |
| 185 | Your diffs, your choice | The probe had no name; deleting the fix left every gate green; the spec contradicted the phase; two documented numbers were wrong | Attack, re-derivation | `5f58b2a`, `343cb80`, `5e45f37` (Phase 197) |
| 186 | The website learns what shipped | The docs said a capture always falls back to Menlo; the two bundled fonts are embedded | Attack | `3b2dc08` in the website checkout |
| 187 | A closed remote tab stays closed | A status list already in flight when you clicked Remove brought the tab back; half the fix was unguarded | Re-derivation, attack, real data | `87e5533` |
| 188 | The sessions table names the project and the age | One impossible timestamp would fail the whole report and kill the live loop | Hostile fixture | `18a516b` (Phase 188.1) |
| 182 | Live Claude usage from the statusLine hook | The token rode on a command line visible to every account; the log could be flooded; the refusal looked in the wrong folder | Hostile fixture, parent measurement | `d878070` |
| 193 | A harness run must not write his known_hosts | The new gate missed nine ordinary ways of starting ssh, then one more | Attack, re-derivation | `589bc7e`, `e47aa07` |
| 191 | A change reads like a redline | The control sat half off screen; a spacing only change looked broken; the harness could leave diff text on his clipboard | App run, re-derivation | `e238ff1` |
| 194 | The redline is a view of its own | One byte too many when the old side began with a newline; a changed last word drew on the next line | Hostile fixture | `c6b8ffd`, `ae5f4b8` |
| 200 | Three points short of 36 | The scale probe was a coin flip and the leak it measured was real and unrepaired; then the repaired ruler still judged heap on one pair | Parent measurement, attack | `0929c6e` |
| 202 | Switch the subscription from the meter | A login folder that was a symbolic link out of Tortie's data was accepted everywhere; a stale read landed under the new login | Attack, real data | `8687bdd`, `0ed26e0` |
| 201 | The map you can read | A crate declared inside another crate was placed twice | Attack, re-derivation | `4abb6ff` |
| 198 | A file's history, followed through renames | The documented command for the app run never delivered the project path | The one app run | `d2b5067` |
| 197 | The third nits round | A new hairline token had two consumers, not one; one commit in the middle failed typecheck alone | Re-derivation | `1371500`, `c366086` |
| 199 | Find a commit by what you remember | A path that left the repository drew the whole history as if it matched; a change search re-ran itself on every file write | Attack, real data | `aeff54a`, `44aff44` |
| 203 | A login is an account | A removed login left its folder and its keychain item behind on his own disk | Real data | `c7a51c3` (Phase 206) |
| 204 | An account you signed into is one you can go back to | Two overlapping reads destroyed a kept account; `/login` could silently lose one; a planted link made Tortie write a credential through it | Re-derivation, attack, real data | `839407b`, `2e5042e`, `b53f2c6` |
| 206 | The fourth nits round | The phase's own app run was red while its commit said green; the new gate passed five shapes it was built to fail | App run, hostile fixture | `e87fcc9`, `7c31927` |
| 205 | The terminal behaves like a terminal | The new edge drag scrolled panes whose program owned the mouse; one arm of the proof could not fail | Attack, re-derivation | `d6efcc4`, `4ee8fde` |
| 209 | A selection you scrolled through copies all of it | Three wrong sentences in files that outlive the round | Real data, re-derivation | `5e36ccb` |

## Phase 169: Oh My Pi becomes a supported agent

**What the phase was.** A community contributor sent pull request 12 adding Oh My Pi, called omp, a command line coding agent. The phase merged it, added the one thing the PR did not ship, which was the icon, and checked every claim in the PR against the real omp binary on the operator's Mac. Landed at `d0e80a2`, version 0.87.0.

**What went wrong.** The PR said the resume test passed end to end. It did not. A fresh omp opens a five step setup wizard asking a person to sign in. The test pane sat on that wizard reading as "waiting on a human". So the PR's strongest claim, that a conversation comes back after a restore, could not be shown on this machine. Two registry fields, multi line paste and image drop, could not be measured for the same reason.

**How the verifier found it.** Real data and attack. It ran the real omp binary from seven hostile working folders, including one with a newline in its name, and compared the folder omp wrote its session into against Tortie's own encoder, byte for byte. All seven matched. It fed forged session files and hostile session ids to the identity checks, all refused. It proved the identity gate was real by building a fake omp that printed a bare version number and watching it be refused. Then it ran the full resume test itself, and that is where the wizard appeared.

**How it was fixed and why.** The fix round read the wizard's own rule out of the compiled binary. The wizard is skipped when resuming or when `OMP_SKIP_SETUP` is set. Tortie's restore passes `--resume`, so a real person was never blocked; only the test's fresh create was. So the product's omp row was left alone, because the wizard is how a real person signs in. The test now sets `OMP_SKIP_SETUP=1` in its own scratch tmux server and removes it before shutdown, and it refuses to set it on the operator's real server, where it would reach his next omp pane. The committer then measured the two unmeasured fields over a real omp pane and moved them to verified. Squashed into `d0e80a2`. Still not true: a live recall turn is unproven on this Mac, because the only provider has a dead token and no automated run may sign the operator in.

**What this verification missed, stated honestly.** Nobody opened Catch Me Up on an omp session. Its keep map had no omp entry and the gate had no omp fixture, so the gate passed. The operator hit the error himself twenty minutes after the phase landed and fixed it in Phase 169.3 at `30a4ac5`.

## Phase 170: the diagnostics report reads every process, sorts, and goes live

**What the phase was.** From two of the operator's screenshots: the report said "Your agents 0 B" beside 75 sessions, most memory cells said "not read", and the bottom half was six piles of labels. He wanted the tables to sort and the report to update live while its tab is visible and go quiet when hidden. Landed at `c01c013`, version 0.88.0.

**What went wrong.** Three things a person would hit. Live mode cost about a whole CPU core, because every two second tick started a fresh `top` and its startup walk over a thousand processes costs 2.2 seconds of system time. Two seconds after opening the tab, the "Terminal surfaces" figure and the window detail cells read "not read", because a live sample from the main process never asks the window for its own facts. And pressing Capture while live ran gave a report over a 24 millisecond window with two "not read" cells. The builders and the verifier also found the charter's stated cause was wrong: memory had been requested for every process since Phase 168, but the one batched `footprint` command took 7.35 seconds against a 5 second deadline, was killed, and delivered nothing.

**How the verifier found it.** Re-derivation, real data and attack. It ran `footprint` by hand with the code's exact arguments over 60 processes and read 12.94 seconds, confirming the deadline kill before accepting any fix. It compared every memory figure on screen against a hand run `footprint` on the same process at the same instant, including a 2.4 GB Chrome helper that matched within 4 KB. And it attacked the resting face rather than the tables, which is what surfaced the empty window facts and the 24 millisecond window. The cost showed up by simply reading the probe's own row on the photographed face.

**How it was fixed and why.** The verifier fixed the second and third defects during integration: the tab fills its own three facts when a sample arrives, and the live subscription stands down for the length of a manual capture. The fix round fixed the cost: one streaming `top` is held open for exactly as long as the subscription instead of a fresh one per tick, killed on every path out, and it ends itself after five minutes if nobody closes it. Measured from outside: 11.6 percent of one core steady, and the main process at 0.7 percent. The re-verifier read the quiet after hide off the process table, zero `top` children in 27 polls. All squashed into `c01c013`. One note has no fix on record: the capture window printed in the header shrinks tick by tick and then resets, because each window opens only after the previous finish waits for the stream's next block. Rated a note, not blocking.

## Phase 172: the Architecture domain gets its inner seams

**What the phase was.** A pure refactor. Three files of about 1,300 to 1,700 lines that each held several jobs were split into smaller modules behind the same doors, in `dee2130`, `72d2f7a` and `a62e4fb`, with the rule that no public channel, schema or state shape may move. Version 0.89.1 at `c29cffb`.

**What went wrong.** An existing screenshot probe for the Architecture view was red at the parent and at the tip alike. Its one seed check wanted a printed line the renderer had stopped printing around Phase 158, so it could never pass. Nobody had noticed. This was pre-existing, not caused by the phase.

**How the verifier found it.** Parent commit measurement, plus re-derivation and attack. It ran the same probes on both trees, which is how an always red probe shows itself. Its own walk of the whole public surface gave the same 182 lines before and after with zero difference, and it proved the walker could fail by planting a renamed channel. It planted an import that reached around each new facade and the boundary gate went red both times.

**How it was fixed and why.** Not in this phase, by design. The charter said a defect found on the way is recorded, not fixed, because fixing it meant changing what the probe prints, which is behaviour. It was fixed in Phase 197 at `e022194`: the probe now checks the seed step that exists and was given a script name, `npm run probe:p63`.

## Phase 176: the Architecture map is clickable again

**What the phase was.** Clicking a box on the Architecture map did nothing; only Enter on a focused box drilled in. The map captured the pointer on every press, and pointer capture retargets the click to the map so the box never sees it. The fix captures only for a hand press, and lazily for a plain press once it crosses the 4 pixel drag threshold. Fix at `7efd14f`, version 0.89.2 at `3d9bb38`.

**What went wrong.** The verifier's verdict was pass, with one note that later became a fix: the drill stage animation waited for a finish event that never fires when the window is covered, because Chromium stops the frame clock for a hidden window. A drill started just before the screen locked left the map dimmed with the overlay up.

**How the verifier found it.** Its own instrument. It bundled the real gesture code twice, parent and fixed, onto a minimal page in one Electron process with real Chromium input, and ran 40 checks including four attack shapes the builder never tried. The camera output for every non click case was byte identical between parent and fixed, which is the executable proof that only the click changed. The note surfaced when its app run drove the drill while the window was covered.

**How it was fixed and why.** Fixed in Phase 197 at `29bc449` with the same shape Phase 183 used for the flight latch: a timer of the animation's duration plus 100 milliseconds lands in the same settle step, so the cleanup runs in bounded time whatever the window is doing, and on the normal path the animation finishes first and the timer never fires. Proved red at the parent by the new test alone.

## Phase 177: a file Tortie cannot read is ignored, not shouted about

**What the phase was.** A hand written file under a repository's `docs/arch/components` folder that is not a Tortie component used to draw two red rows each; on the operator's rookery repository that was 34 lines for 17 leftovers. His ruling was ignore quietly. One rule now decides whether a file is recognisably a component, and a file that fails it folds to one calm line. Fold at `6032c94`, version 0.89.3 at `69d0e27`.

**What went wrong.** A components file whose whole text is the word `null` vanished with no line at all. The parser answered a null value with no problems, and the loader's guard could not tell a parse failure from a parsed null, so the file was dropped silently. That broke the module's own rule that nothing is ever silently dropped. Two notes rode with it: a byte order mark ahead of a valid component refused the whole file, and a refusal said a field "is empty" when it was missing.

**How the verifier found it.** Hostile fixture and parent commit measurement. It wrote a 17 file corpus, including a bare number, a top level array, an empty file, a file of `null` and a byte order mark, and drove it through the real load path rather than the validator alone, which no builder test did. Then it ran the same corpus on the parent: the foreign shapes drew two lines before and one after, proving the fix moved the number it claimed.

**How it was fixed and why.** Every parse site now judges a parse by its list of problems rather than by whether the value is null, so a parsed null flows on and can never vanish. The parser strips one leading byte order mark. The refusal says "names no place", true whether the field is missing or empty. Five tests were written first and failed on the unfixed tree. Commit `f2e9a12`. The re-verifier wrote its own 16 shape corpus blind to the builder's tests and audited every parser call site. The conformance gate now pins the foreign fixture's per file total at one.

## Phase 173: the remote fault matrix is adjudicated

**What the phase was.** Tortie can talk to sessions on another machine over ssh. A ten row test matrix drives faults at that link and checks that no session is lost and no status lies. Two rows had been red since 2026-08-19. The ruling was that the product was right and the test graded stillness before its own setup had settled. No product code moved. Landed at `241654f`.

**What went wrong.** The commit said the type checker was green. From a clean cache it was red, on an array read in the new grading code that TypeScript could not prove was defined. The builder's green came from a stale cache. The commit body also attributed a proof to the wrong run artifact.

**How the verifier found it.** Attack, the simplest one: it wiped the type checker cache and ran the check at the tip, then again with the parent's file swapped in. Red at the tip, green with the parent's file. It also re-derived both red rows' status ladders from the raw run logs by hand, fed planted facts to the new graders to prove they could fail, and ran its own ten row matrix on a fresh socket, which passed.

**How it was fixed and why.** One line of optional chaining, `4b8427b`, so the read is defined by the type system as well as by the length guard that already protected it at runtime. The fix agent proved the new form byte identical over twenty thousand sample streams. Nothing guards the stale cache by code; every later run states it typechecked from a clean cache, and that habit started here. Version 0.89.4 at `8e0030f`.

## Phase 178: the Architecture face reads honest and thin

**What the phase was.** The Architecture view draws a picture of a repository from its imports. On a repository Tortie mostly cannot read, such as one in Swift and Kotlin, the picture was thin but the words did not say so. The phase put the sentence naming the unread files on the face, made the verdict strip say plainly when no promises are written, and taught the import reader to find every package.json in a tree. Landed at `cde6566`.

**What went wrong.** The strip read "9 evidence checks hold, none a promise", but all nine were anchor checks and not one was an evidence check. A phase whose whole point was to stop words claiming what the data does not say had shipped a label doing exactly that. And the commit body said the face read "1276 swift, 166 c, 43 kt". The scan only sees tracked files; the tracked counts were 168 md, 87 swift and 43 kt.

**How the verifier found it.** Re-derivation, attack and the app run. It wrote its own import scanner from the rules and matched the builder's six unresolved imports file for file. It attacked the label by planting exactly one real evidence quote and reading "10 evidence checks hold" off the live strip, which proved the nine were anchors. Its own tracked file count refuted the 1276 figure.

**How it was fixed and why.** The label became a function of the count that says "checks hold, none a promise", singular at one, and the fixture now carries the measured counts and pins the strip text. The wrong clause in the running log was corrected in place with the date. Commit `f7c0f3d`, version 0.89.6 at `25b5622`.

## Phase 180: the client languages

**What the phase was.** The import reader learned Swift, Kotlin and Objective-C. Swift resolves at target grain, meaning an import lands on a target's folder rather than a file, because Swift files in one target reach each other with no import statement. Grammars at `9733591`, resolver at `5a75b54`.

**What went wrong.** A false green, the worst print the design names. Every Swift answer is a folder, but the promise checker looked answers up in a table keyed only by files. A folder answer matched nothing, counted as neither a crossing nor a miss, and vanished. On the test repository a must-not promise crossed by 33 real Swift imports printed as kept, and the commit had claimed the opposite. Go's folder answers had the same hole, and no gate could catch it because the fixture routed no Swift file through the checker.

**How the verifier found it.** Attack, run end to end. It planted a must-not and ran it through the shipping document loader, fact gatherer and checker over a real repository copy and read the verdict, rather than judging the answer at the resolver's edge. Beside that, an independent Python pipeline with its own parsers agreed with the shipped resolver on all 893 file and specifier pairs, and a hostile fixture repository answered unresolved everywhere.

**How it was fixed and why.** The checker now falls back to the components that own files under a folder answer's prefix, so the same run prints divergent with 33 offending and the honest reverse promise stays kept. Fixture rows for a Swift and a Go folder answer were added to the gate and proved to fail against the pre-fix checker. Squashed into `5a75b54`, whose tree was proved byte identical to the one the re-verifier blessed. `npm run conformance:arch` guards it. Version 0.91.0 at `8036fa2`.

## Phase 184: the five languages that were left

**What the phase was.** The import reader learned Java, PHP, C, C++ and C sharp, one commit per language, measured over public repositories. Landed at `2175d52`, version 0.99.0.

**What went wrong.** The binding rule for every reader is that a name it cannot place answers unresolved and never external, because an external answer is dropped from both sides of the checker and turns a broken must-not green. Six answers broke that rule. Round one: the PHP reader called a repository's own classes a dependency whenever the autoload map missed, 7,418 of 11,638 statements in one repository; a C sharp project at the root produced an empty folder answer that vanished exactly as Phase 180's had; a project file claiming a file outside itself stole that file from its real project; and a Java repository whose group matched a dependency's group read as having no code of its own. Round two: the C sharp reader ignored namespaces declared by files no project owned, 397 real statements; and the Java reader read Maven's identity but not Gradle's, so one repository's 137 own imports still read external. In each case a planted must-not crossed by real imports printed as kept.

**How the verifier found it.** All five methods. Both verifications cloned repositories the builder never used, built truth indexes from each file's own package or namespace declaration, and asked of every external answer whether the repository itself declared that name. Planted must-nots ran end to end with a control edge beside each to prove the judge could still go red. Eleven hostile manifest fixtures covered every trap named. The parent was archived and run over the same corpora to prove the nine older readers did not move, 16,849 rows with zero differences. A process watcher sampled every 20 milliseconds to prove no build tool was ever spawned.

**How it was fixed and why.** Round one, four commits: `a2df598` treats an empty path as a miss that withholds the verdict, because an edge to everywhere is not an edge; `2f6965c` refuses a root C sharp project and returns every project that claims a file; `e92dd70` makes a matched autoload prefix with no file answer unresolved; `31be389` reads a pom's own group so a dependency sharing it cannot claim the repository's own package. The fix round also refuted one clause of the verdict by measurement and put that limit on the reader's face. Round two, by the committer after re-deriving both findings: `51ca259` reads every tracked C sharp file's namespace whatever owns it; `89cd77d` reads a literal Gradle group as the repository's identity. `34d7216` puts both refusals in the gate with a control beside each. Over 29 repositories and about 92,000 rows, the only answers that moved were the ones named.

## Phase 175: Architecture behind a switch

**What the phase was.** The operator wanted the whole Architecture feature hidden behind a setting that defaults to off, so the code could ship before he had soaked it. The switch gates the rail mark, three menu rows, two keyboard chords and the map opener. Landed at `31f0afd`.

**What went wrong.** An Architecture map tab that was already open survived the switch being turned off, live and usable. The pane is derived from the setting and went away; a tab is state and nobody closed it. The commit body had claimed turning it off removes all of it. The builder's probe read the tab only while the switch was off, where it had never been opened. The guard against a fourth reader of the remembered view was also a hand written list of three files, so a fourth would never be scanned. And no version bump had been made.

**How the verifier found it.** Attack, in one app run. It clicked the real switch in the real Settings window rather than writing through the bridge, opened the map while on, flipped off, and read the tab still there. It relaunched on the same profile to prove the boot claim. It attacked the sanitizer with a string and a number for the boolean. Then it grepped the tree itself for every reader of the stored view and planted the old shape back into one to prove the guarding test bit.

**How it was fixed and why.** A watcher installed at boot force closes every map tab when the switch goes off, force because the map tab has no dirty state and so no prompt to lose. The reader set in the guarding test is now derived by scanning every renderer file that names the stored view. The probe gained a pass that opens the map while on and reads it away after the flip. Fix at `860d8a2`, version 0.92.0 at `92bcd46`. One note, that turning the switch off does not disarm a file watch armed while on, was left out of scope with the seam named in a comment.

## Phase 181: the usage meter

**What the phase was.** Tortie shows how much of a person's Claude and Codex plan is used, served by the vendor rather than estimated. It reads the stored login read only, asks once every fifteen minutes while the window is in front, and draws one bar per provider. Both switches default off. Landed at `16281b3`, version 0.93.0.

**What went wrong.** The feature did not answer its own switch. Turning a meter on drew nothing for up to fifteen minutes, and turning it off left the numbers on screen. The store started polling once behind a flag, only re-asked after fifteen minutes, and nothing listened for settings changes. A person flipping the switch would conclude it was broken. Three notes: the strip drew any percentage it was given, including NaN and 500; nothing bounded a reset date, so one hover card read "Resets in 11574053377d"; and the Claude endpoint answers an unauthenticated request with a 429 rather than a 401.

**How the verifier found it.** Attack, hostile fixture, real data and re-derivation, in the one app run. It drove the journey a person takes: boot with the shipped default, flip the switch, watch the screen at twelve marks over a minute. It wrote 31 hostile response bodies and proved them able to fail by planting five defects in the source one at a time. It recorded every remote connection, every spawn and every channel payload, then scanned 136 million bytes for 24 needles built from the operator's own login and found none.

**How it was fixed and why.** One subscription to the settings change event main already broadcasts, reconciling on the rule that what is drawn agrees with the switch. An off row keeps only its retry wait so a flip cannot walk past a wait the vendor asked for. A forty day horizon bounds every reset, and a percentage that cannot be drawn honestly draws nothing. A new probe drives three off-on-off cycles with no credential read and fails against the parent's store. Commit `cf08930`. The 429 mapping was deliberately left, with the reasoning in research 72.

## Phase 174.1: the font field holds still and suggests

**What the phase was.** The custom font field in Settings jumped 9 pixels upward every time its "not installed on this Mac" note appeared, which was every few keystrokes. The operator reported it. The phase holds the note's line always, so the box never moves, and adds a list of installed families with monospace faces leading. Landed at `9a19ddd`.

**What went wrong.** The product offered two families in its own list and then said they were not installed. Both were icon fonts in the operator's own font folder, genuinely installed. The availability check measured a Latin sample against fallback fonts, and an icon font with no Latin glyphs falls back for every character, so it was judged missing. Three notes: nothing pinned the one CSS rule that fixed the jump; the sanitizer stripped control bytes but not invisible direction and zero width characters; and deduplication was case sensitive.

**How the verifier found it.** Parent commit measurement, attack and re-derivation. It built the exact parent the charter named and read the box on every one of 16 steps of its own journey. It read the family list a third way, parsing the name table out of every font file on the Mac, and reached exact agreement with the 263 offered. Then it ran the product's own availability check over all 263, found two unavailable, typed each into the real field and read the real note.

**How it was fixed and why.** The availability check asks the platform list first, and a yes ends the question; a no still falls through to the unchanged measurement, because the list holds no bundled face. The sanitizer strips the invisible set. Dedup folds case. Every guard was proved able to fail by reverting the line it guards. The harness now pins its window on top for the length of a drive, because a covered page refuses the font query and throttles timers to one a minute, which hung the fix round's probe twice. Commit `84a8b6c`, version 0.94.0 at `68de77e`.

## Phase 181.1: the usage meter gives way to the tabs and settles into Agents

**What the phase was.** The meter sat in the tab bar beside the project tabs, and when the tabs ran short of room the meter got squeezed until its two provider rows drew on top of each other. The operator ruled that the tabs give way. The phase also moved the Usage settings into the Agents page. Landed at `5144627`.

**What went wrong.** The smallest form of the meter still wore styling written for the collapsed left rail: a top margin, full width, a top border and a column layout. In the 36 pixel tab strip that put it 7 pixels low, drew a stray line across the strip, and with two providers stacked the rows so they overlapped by 31 pixels. That is the operator's photograph again. And the phase's own regression probe could not fail on the defect it was written for: it compared boxes against boxes, and only the painted text spilled outside them. Run against the parent, all three checks read zero.

**How the verifier found it.** Re-derivation, parent commit measurement, hostile fixture, and an attack on the phase's own gate. It wrote its own probe that reads rectangles only. It built the parent at `a57f204` and measured it with the same instrument. It injected a real second provider row into the live layout. And it ran the builder's probe unchanged against the parent build and watched it pass.

**How it was fixed and why.** The four rail rules were scoped to the collapsed rail, so the mini class carries only what mini means everywhere. The probe now measures painted text against every ancestor; against the parent it fails on 13 findings. The fix round also found its readings were a picture of a stopped window, because Electron throttles a window that is not in front, so every reading is now taken after forcing a frame. Commit `ed977d0`, version 0.94.1 at `df37192`. The guard is `npm run probe:p1811`.

## Phase 181.2: the bar tracks a chosen window, the card clears the tabs and names the account

**What the phase was.** A new setting chooses which window the usage bar fills to: the last five hours, this week, or whichever is further along. The hover card is drawn above the project tabs instead of behind them and names each login's plan. Landed at `1ea852c`.

**What went wrong.** Three things. The phase added a setting, which is minor, yet it recorded itself at the patch version Phase 181.1 had just released at, with no bump. Neither fix had a guard that could fail: put the card's stacking order back and every gate stayed green while the photograph came back, and the drawn bar was checked nowhere. And the commit body said the plan word gate refuses keys and ids by shape, when it refuses them only by length. The fix round's corrected sentence was itself wrong about which lengths the cap stops.

**How the verifier found it.** Re-derivation and parent commit measurement. It divided the painted fill width by its track and compared that to the number in the text beside it, on the operator's real logins. It rebuilt the parent at `628d6b2` and proved the card was covered by decoding a screenshot pixel by pixel. The re-verifier reverted both fixes in one tree and got four failures from the new probe, then measured the plan gate against the real function to find the correction wrong.

**How it was fixed and why.** `7b3d2e3` added `npm run probe:p1812`, twelve rows in one app run with a self test in which six fixtures must fail, and bumped to 0.95.0 at `e176a7e`. `d620d5c` replaced the comment with a measured table and turned the guard into a test that reads every production file and asserts the exact argument at all three call sites. Not fixed: the re-verifier counted 18 more scripts missing from the Electron teardown list, recorded as pre-existing drift.

## Phase 185: your diffs, your choice

**What the phase was.** The diff view gets a control row: Off, Words, Phrases or Characters for what is picked out inside a changed line, and a toggle for the full width colour on changed rows. The phase's own finding was that the option passed to the diff surface was silently ignored because a worker pool overrode it. Landed at `0a31afb`.

**What went wrong.** The only guard that runs rather than reads, the probe, had no npm script, so nobody could run it by name, and deleting the fix left typecheck, build and all 11,309 tests green. The design spec still said where a diff preference lives in a way that contradicted the phase. Four notes: under the very defect the probe exists to catch, its wait ran past the harness deadline; the control row flashed in and out on an identical file; the toggle's accessible name read as a command; and two sets of span counts lived in the tree with one labelled. The re-verifier then found two documented measurements wrong. The committer received that report truncated and fixed two different wrong numbers instead, so the two named stayed in the tree.

**How the verifier found it.** Re-derivation and attack. Its own longest common subsequence over characters and tokens, with no diff library, compared to the offsets walked out of the running app. It removed the pool push and re-ran the phase's probe. It measured on a reverted worktree and a fresh profile. The re-verifier wrote its own server side renderer and two span readers.

**How it was fixed and why.** `5f58b2a` caps the wait at six seconds a mode. `662457b` names the toggle and spells color as the app does. `343cb80` gates the row on the skeleton's own condition and guards the flash with a reading proved red under the old gate. The probe is registered as `npm run probe:p185`, and the spec records where a diff preference lives. `eb61f53` corrects the eager set figure. The two re-verify blockers landed in Phase 197 at `5e45f37`. Version 0.96.0 at `c9dbf5a`.

## Phase 186: the website learns what shipped

**What the phase was.** A changelog entry and documentation pages for the product website, in a separate checkout, committed but deliberately not pushed so the operator could review it in the morning. On this repository the record is `aa47fd2`.

**What went wrong.** The documentation said a captured session stays in Menlo whichever font you chose. That is false for the two bundled fonts, JetBrains Mono and Source Code Pro, which are embedded into a capture; only a custom font falls back to Menlo. Three notes: a sentence named the wrong font token for the sidebar, a grammar slip, and a dropped tail on one changelog item, which was ruled correct and left.

**How the verifier found it.** Attack. It checked every documentation claim against the product tree at 0.97.0 rather than against the changelog. It also re-derived the changelog by running the site's own generator and comparing item by item.

**How it was fixed and why.** Three edits to the docs data, scoping the capture limit to a custom font and correcting the sidebar sentence. Committed as `3b2dc08` in the website checkout, unpushed. That hash is not in this repository and cannot be checked here with git; the record of it is the run's journal, the running log and `aa47fd2`.

## Phase 187: a closed remote tab stays closed

**What the phase was.** Closing a session on a remote machine tab brought the tab back a few seconds later, and a second Remove was needed. The first fix, `2e9650c`, found that main kept two lists per machine which could hold the same id, and that the Remove's short circuit left the row in place.

**What went wrong.** The first fix left the shape a person actually meets. A status list already on the wire when you click Remove answers after it with the membership from before the close, and the pass wrote that answer as truth. Measured 200 of 200 came back at the first fix's tip and at its parent, so those lines neither caused nor cured it. Half the first fix was also unguarded: put the short circuit back and every check stayed green. And a scratch ssh agent from the phase's own probe was still running hours later, because its teardown sat above the block that would have ended it.

**How the verifier found it.** Re-derivation, attack and real data. Its own randomised harness drove 200 lives with a seven step vocabulary at both commits, 37 of 200 returned at the parent and 0 at the tip. Then six scenarios in which the in flight list still returned the row, an ablation of each line of the fix, and a run on a loopback ssh server.

**How it was fixed and why.** `87e5533` stamps the instant of every Remove, and a pass whose snapshot predates it may not reinstate that id; the tie goes to the person, because a strict comparison let 194 of 200 back in. The guard grew five arms so each line has one that fails for it. `af898ba` ends the scratch agent on process exit. `50b49fe` adds a race arm to the probe, 3 of 3 back at the parent and 0 of 5 at the tip; its first version passed at the parent for the wrong reason and was rewritten. The guard is `npm run conformance:remoteclose`. Version 0.97.1 at `7d15e68`.

## Phase 188: the sessions table names the project and the age

**What the phase was.** The diagnostics report's sessions table gained Project, Started and Last seen columns, so a person can tell which project a heavy row belongs to. Landed at `06fbe2c`.

**What went wrong.** The new stamp formatter handed every value to a date function that throws for an impossible instant. The call sat inside the unguarded capture, so one corrupt manifest stamp would fail the whole report, and the live loop would die after three ticks. The pane whose job is diagnosing a sick app would be the thing that goes dark.

**How the verifier found it.** Hostile fixture of seven shapes the builder never built, including a 210 character name, markup, a newline, a zero timestamp and a future one; re-derivation with its own SQL and formatter over 51 checks; and the parent's component rendered beside the new one over one report.

**How it was fixed and why.** Not in this phase. The committer declined the one clause guard so the verified bytes stayed the committed bytes, and recorded it as a known limit. Fixed in Phase 188.1 at `18a516b`, where the stamp answers "unknown" for anything it cannot render, as a range check and not a clamp. Two other notes, a newline in a project name splitting a pasted line and a horizontal scrollbar in a narrow pane, were recorded and not changed.

## Phase 182: live Claude usage from the statusLine hook

**What the phase was.** Claude Code hands its status line command a block of rate limit numbers on every turn. Tortie installs a small status line script that posts those numbers to its own loopback server, so the meter moves on your own turns instead of only on its fifteen minute poll. It refuses to install if you already have a status line of your own. Built at `650b5b3`.

**What went wrong.** Six findings over two verifications. The source said three times that the token is never in a command line, but the script put the per session token on curl's command line every fifteen seconds per pane, readable by any account through `ps`. Any local process with no token could write one warning line per post to the app log, about 7,700 a second, erasing the operator's diagnostic history in seconds; the first verifier rated this should_fix and the build landed with it unfixed. The refusal looked only at the working folder, while Claude Code also reads the checkout root's settings, so a session started in a subfolder could have Tortie's status line installed over the person's own. The token file was written readable by everyone where the ruling asked for owner only. Two file shapes were never swept. The re-verifier found the fix round uncommitted, and a second unbounded log path: 120 lines an hour from one idle pane forever.

**How the verifier found it.** Hostile fixture over a real socket: the real hook server and the real usage service bundled into a plain node process, attacked from outside with curl over 32 cases and a flood, with a credential sentinel searched for in every file and log line. Re-derivation from the shipped binary's own settings label map, which settled that the refusal's scope is the checkout root. Parent commit measurement by watching the process table every 50 milliseconds during a hung post: the token was visible in 24 of 26 snapshots before and 0 of 25 after.

**How it was fixed and why.** `d878070`. curl now reads its destination from an owner only file that is unlinked after the post, so the token stays out of every command line and the rule is kept rather than reworded. Drops are logged once per reason per process on both paths. The refusal walks up to the git root. The file mode is set explicitly. The sweep reaches temporary and stamp files. Research 72 gained a section so the next agent inherits the measurements. Not fixed: the refusal is still a log line rather than something a person is told on screen.

## Phase 193: a harness run must not be able to write in his known_hosts

**What the phase was.** The test scripts start ssh against loopback machines, and each ssh run can add a line to the operator's own known hosts file, where ssh remembers which machines it has seen. Phase 187 noticed three loopback lines in his file. The phase gave every script one shared helper that always names Tortie's own record file, and a build time gate that scans every script for an ssh started without it. The reproduction came back not reproduced: no script could write in his file at 185 real ssh runs, so the three lines were residue of an older defect already fixed.

**What went wrong.** The gate printed a claim stronger than what it checked. Nine ordinary ways of starting ssh walked straight past it: an `execSync` call, a spawn with `shell: true`, `bash -lc`, a command line held in a variable, a wrapper function with a name not on the gate's hard coded list, and a program chosen with a fallback. Every one really resolves to his own file. The gate had been written to the one spelling in the tree rather than to the shape. After the fix, one more shape still walked past: a program name assigned to a variable through an if/else branch, which one real script held at the parent.

**How the verifier found it.** Attack and re-derivation. It wrote 21 hostile scripts, planted each under the build folder, ran the shipped gate the way the build runs it, and read the exit code. Nine passed. It proved each miss was a real leak by asking ssh itself with `ssh -G`, which resolves options and connects to nothing. Its second method was a scanner of its own against the TypeScript syntax tree, the opposite technique to the gate's regular expressions; the two agreed at 38 sites. The re-verifier wrote 14 more fixtures and a whole planted probe file, and its own scanner found 39 sites, not 38.

**How it was fixed and why.** `589bc7e` makes the gate discover which calls are spawns per file rather than hold a list, reads a command line wherever a shell can be given one, resolves a program held behind a fallback, and walks the whole folder. All shapes became committed fixtures in `07bbcbe`, most of which must make the gate fail, so the coverage cannot decay. The committer re-derived the 39 with a third scanner and in `e47aa07` made a name resolve through every value it is ever assigned, three levels deep, while refusing a wrapper's own bare parameter, because widening alone read every wrapper as an ssh spawn. The gate runs inside `npm run build`. His file was 2,120 bytes before and after, read for its size and hash only. The whole lesson is in `CLAUDE.md`.

## Phase 191: a change reads like a redline

**What the phase was.** When a text or markdown file is open as a diff in one column, a Redline control adds a row under each changed block that shows the deleted words struck through in red and the inserted words after them in green, the way a legal redline reads.

**What went wrong.** Six things, two blocking. The new control sat more than half off screen at the editor panel's narrowest width, four lines below a comment saying that could not happen. A whitespace only change drew an unmarked sentence under a block the diff had painted red and green, which is the exact "looks broken" picture that started the phase. A comment claimed the deletion always sits immediately before its insertion, and the app drew the opposite. The disclosure about copying understated what landed on the clipboard. The harness wrote the operator's own clipboard and put it back only on the happy path, so any throw left diff text on his pasteboard. And when the prior clipboard was empty it cleared every flavour.

**How the verifier found it.** The one app run, with re-derivation. It called the diff library itself from node over nine blocks of its own and compared the runs to what was drawn in the app character by character. It measured the control row at the panel floor by driving the divider's own Home key, 319 pixels of room against 356 needed. It read the real system clipboard through the window's own Copy command. And it walked the harness source by matching braces to show the restore sat inside a try with no finally.

**How it was fixed and why.** All six were reproduced before a line changed, and all six fixed in eight commits squashed into `e238ff1`. The row wraps to two lines at the floor. A spacing only block carries a two word tag. The comment states the run order the library actually returns. The copy disclosure carries the clipboard reading verbatim. The harness saves every clipboard flavour it can read and restores them inside a finally. The redline gate grew four rules, each proved red under mutation.

## Phase 194: the redline is a view of its own

**What the phase was.** The operator looked at Phase 191 and did not want the toggle inside the diff; one changed line drew three rows. `1c1e4e4` removed that control and the phase built Redline as a third choice beside Diff and File: the whole document drawn as flowing prose with every change marked in place, read only, with nothing elided.

**What went wrong.** Two blocking defects in the composer. When a file's old side began with a newline and the new side did not, the fallback asked for the last newline before position minus one, which clamps to zero, so the drawn document carried one newline the new file never had: 10,591 bytes against a 10,590 byte file. The phase's one correctness claim is that both projections are byte exact. Second, a change to the last word of a line drew the insertion on the line beneath, because the library attaches a word's trailing whitespace to its token, so "Monday" struck through was followed by "Friday" on the next line. That appeared in 11 of 99 pairs across the verifier's fixtures.

**How the verifier found it.** Hostile fixture and re-derivation. It wrote 19 prose fixtures and its own in page driver that clicks the real tree rows and reads the composed document as ordered plain, deleted and inserted runs, then strips the insertions and compares to the old file and strips the deletions and compares to the new file. One fixture came back one byte off. It also measured the parent at `2cbab50` in a second app run and read the real clipboard.

**How it was fixed and why.** The prefix defect was fixed in `c6b8ffd`: a prefix of zero stays zero. The last word defect in `ae5f4b8`: after the exact runs are computed, whitespace shared by an adjacent deletion and insertion is peeled out into the plain runs on either side, with a gate rule that no pair shares an edge whitespace character, red 87 times with the peel removed. `53feab7` judges the fix by rectangles. Recorded and not fixed on purpose: Cmd-A from the Edit menu selects the whole app and Copy then yields interleaved text; ruled a known limit.

## Phase 200: three points short of 36

**What the phase was.** An architecture audit scored the tree 33 of 36 and named the safe order to 36. Four items, one commit each: the durable create classifier reads structure instead of identity, `cd338cb`; three services shut down as one joined operation, `8ea7248`; three test seams that lied are closed, `c0f798d`; and reduced motion refuses a transition instead of shortening it, `0929c6e`.

**What went wrong.** The scale probe the phase leaned on as its closing proof was a coin flip: three runs of the same command on the same commit read 967/967/967, then 967/967/1272, then 2606/4268/5930 nodes, and the last one failed while the commit body carried a single green sample. The memory retention itself was real and unrepaired. After the fix round, the re-verifier found the repaired ruler judged every block pair for nodes and listeners but still judged the renderer heap on the last pair alone, so a tree that retained memory and released it in the last block read green in the one dimension the failing profile fails on.

**How the verifier found it.** Parent commit measurement and attack. Every item was shown red at the parent with the verifier's own commands, and the scale probe was run three times. It attacked the shutdown with nine late request shapes the builder never wrote, four red at the parent. The re-verifier lifted the grader out of the commit and fed it a shape with heap rising then falling while nodes and listeners stayed flat; the grader called it green.

**How it was fixed and why.** The fix round found the cause from a 50 MB heap snapshot: the reduced motion rule set every transition to one millisecond and left the property as all, so the diff container transitioned the colours the library lands on it after insert, and a transition still running at removal is held by the document with the whole detached tree. One declaration, `transition-property: none`, is the repair. The ruler now judges every pair, reads the computed transition property as a reading that is not a race, and drives at a quarter CPU speed. The committer re-derived the heap finding, added two fixtures, and corrected three overstatements in the record, all inside `0929c6e`. Recorded and not fixed: the split profile still fails its renderer heap in one run of two at both commits and nobody knows why, which is why the phase is 35 of 36 by its own count and 34 by the verifier's.

## Phase 202: switch the subscription from the usage meter

**What the phase was.** A person can hover the usage meter, see which login it is reading, and choose another account or add one. A login is a folder Tortie owns that only the vendor's own sign in writes; a new session launches with its config folder pointed at it, and the person's own default sign in is read only forever.

**What went wrong.** Two blocking findings and one minor. A login folder that was a symbolic link out of Tortie's own data was accepted everywhere: the ownership check compared resolved path strings, and `resolve` does not follow links, so a planted entry passed, was listed, could be chosen, and reached a pane as the config folder. That folder decides claude's settings, hooks and plugins, so a writer of it would decide what runs with no human confirming the bytes, which is refusal 8 exactly. Second, a vendor read left in flight across a login switch landed under the new login's name marked current and sat there for a full poll. Third, a sentence was exported and drawn nowhere.

**How the verifier found it.** Attack over real data. It wrote its own drive, its own fixture logins with synthetic tokens and its own readers, asking tmux for the pane environment rather than the builder's stub, 44 readings. It planted the link and a one row store file before the app started, which is the whole threat model, and read six surfaces that all followed it. It drove the shipping usage service under a transport it could hold open to catch the in flight read. It hashed his three credential files before and after, byte identical, and scanned 8,011 files for needles from his real codex secret with zero hits.

**How it was fixed and why.** `8687bdd` asks the disk a second question: `lstat` on the entry, the provider root and the logins root, so a link in any component Tortie composes is refused rather than followed. It is asked at the read, at the resolver, and in front of the credential file test. `12fb66d` plants four real links in the gate. `0ed26e0` carries the login a fetch was issued for into its answer and drops an outcome whose login no longer matches. `be87406` plants the verifier's link in the app run. Recorded and not fixed: Add login still creates an empty folder outside the root when the provider root itself is a link, bounded because the row is dropped at every later read.

## Phase 201: the map you can read

**What the phase was.** Architecture can now be read as sentences. A reading partition cuts a repository into boxes, one scan gathers ten facts per box, and a composer writes one sentence per part saying what it is, what it is made of, who uses it and what it uses.

**What went wrong.** A nested workspace member, such as a Cargo crate declared inside another crate, was placed twice: the seed loop never consulted what was already placed, so the inner crate's files landed in both boxes, 13 files placed of 10 tracked, and the repository sentence counted five parts of a four part tree. The last fallback wording, "no imports either way", read as false beside a hover listing eight imports. Three smaller notes: a Declares hover listing manifests anywhere in the box, a folder's bracket stripped from its name, and the tree read following a tracked link outside the repository.

**How the verifier found it.** Attack, re-derivation and real data. It wrote its own partition from the research text alone before reading the code and compared box for box on three repositories; where they disagreed the bug was its own. It attacked the composer with ten hand built tree shapes, and the nested seed shape found the defect. It cloned a fourth repository in Python, a language none of the three used, and judged every sentence itself, 14 of 15 clear.

**How it was fixed and why.** Seeds are read deepest first and a placed file is skipped, `4abb6ff`, with the verifier's tree in the tests and a new ablation in the gate. The fallback says "imports no other part and none imports it", `fae2f1a`. Declares reads only from a manifest at the box root, `ea6a65e`; a partner keeps its bracket, `4ff3d6e`; the tree read uses `lstat` so a link is skipped, `c9583b9`; the floor comment names its repository, `5fe4f0a`.

## Phase 198: a file's history, followed through its renames

**What the phase was.** Right click a file in the Explorer and choose History. Source Control then shows that one file's commits, followed back through renames and copies. Landed at `d2b5067`.

**What went wrong.** The command the phase documented for its own app run did not work. Both the conventions and the probe's header said to pass the project as an argument after `--`. That form never delivered the path, because the harness script reads one command and nothing after it. Anyone following the instructions got a refusal and no run. The product was fine; the instructions for proving it were wrong.

**How the verifier found it.** The one app run, tried the documented way. It also ran the walk over real data with its own reader, written without looking at the phase's: 609 of 609 followed rows over git's own `builtin/log.c` identical to the shipping walk. It attacked the walk with a path holding a star and a bracket, a copy with spaces, a deleted file and a newline in a name, all of which behaved.

**How it was fixed and why.** The committer fixed the instructions rather than the script, in `d2b5067`. The working form is `P198_PROJECT=<copy> npm run probe:p198`, which passed 19 of 19, and the conventions and the probe header now say so. `npm run conformance:filehistory` guards the walk itself; nothing guards a documented command line, which is why a verifier trying it matters.

## Phase 197: the third nits round

**What the phase was.** A round of 24 small recorded items, one commit each: 13 fixed, 11 refuted as already landed or by design. Landed at `55b4e8c`.

**What went wrong.** Item 24 added a new hairline colour for a border drawn on the selected fill, and its commit body claimed exactly one place needed it. There were two. The Aim button in the Architecture pane also drew the old hairline on the same fill when hovered, at a contrast of 1.013 to 1, which is the very defect the token exists to fix. Second, one commit in the middle of the round failed the typecheck gate on its own, because its fix sat in a later commit. The round's reason for one commit per nit is that a bisect can name the one that broke something, and a red commit in the middle defeats that.

**How the verifier found it.** Re-derivation, twice. It wrote its own CSS scanner that joined every rule painting the active fill to the border its base rule wears, over 2,223 rules in 65 files, and found two consumers. It decoded the harness photograph with its own reader and read the edge pixels. For the second finding it ran the import boundary gate over each commit separately, which the builder had only run at the tip. It also attacked the font sanitizer with 22 invisible characters, 21 of which rode through.

**How it was fixed and why.** One line so the Aim button's hover takes the new hairline, the commit body corrected to two consumers, and the probe reads that rule from the live stylesheet, `1371500`. The red commit was squashed into the one it fixed, `c366086`, so every commit in the round passes alone. The second verifier found three comment lines still naming the wrong kind of fill, amended inside the same commit. The 21 invisible characters were recorded rather than fixed here, outside the item's charter, and Phase 206 fixed them at `b5c2523`.

## Phase 199: find a commit by what you remember of it

**What the phase was.** A search field at the head of the History list. Type a word, an author, a commit, a file path or a change term, and the history narrows as you type. Landed at `11a6366`.

**What went wrong.** Three things a person would hit. Typing a file path that leaves the repository, such as `file:/etc/passwd`, drew the whole unfiltered history as if it matched, with no message. The service refused the path correctly, but the pane caught the refusal and fell through to its plain walk, which carries no filter. Second, a change search you had run from the button ran itself again every time anything in the repository changed; agents write files constantly, and on git's own repository each rerun costs 9 to 21 seconds of CPU. Third, found by the fix round: pressing Enter inside the 150 millisecond typing delay let the delayed plain walk cancel the change search you had just started.

**How the verifier found it.** Attack and real data. It typed 40 hostile shapes into the real field on two repositories. With a change search on screen, it wrote a file into its own clone and watched a second search start three seconds later. It also re-derived 148 queries with its own git command lines against the rows the pane drew, with zero disagreements.

**How it was fixed and why.** The fix round first reproduced both findings with a store test over a fake bridge that counts the walks sent. In `aeff54a`, a refused walk under a query draws zero rows and the refusal's sentence, and only the plain walk may reach the fallback; a repository change keeps the change rows and re-reads only the branches. The fix round did not take the verifier's literal prescription, because re-walking the fast half would have replaced the rows the button drew. In `44aff44` the typing rule is asked again at the instant its timer fires. The probe gained two rows in `0e3043d`, red at the parent's store.

## Phase 203: a login is an account, and the menu tells the truth

**What the phase was.** Every login is drawn by the address of the account signed into it, and a login whose credential lives only in the keychain reads as signed in, because on macOS the vendor writes no credential file for a second claude login and the old list asked for one. Landed at `93eb4f3`.

**What went wrong.** Nothing that changed the phase; the verifier approved. But it found, on the operator's own disk, a login folder and its keychain item left behind after a Remove, with no row naming them. The keychain item held a whole credential of his that nothing could reach. Remove had deleted the row and not the rest.

**How the verifier found it.** Real data. It ran the shipping list over the operator's own login store, read only, and checked every cell against its own keychain attribute reads, never the secret. That is how the orphan showed up. It also attacked the account reader with 76 hostile shapes under node and 20 more in the app, including markup in an address and a file that was a script tag; none reached a menu label. It re-derived the codex address from the identity token in python and agreed exactly. It said plainly that nobody has driven a sign in end to end, because doing so would sign somebody in.

**How it was fixed and why.** Fixed as Phase 206 item 1 at `c7a51c3`. A Remove now clears all four stores a login has: the vendor's own keychain item and its staged sibling, Tortie's own slot, the record row, and the folder. The order is reversed as well, credentials first and the row second, so a crash between the halves cannot strand stores whose only name is the id the file just forgot. The answer was to finish the removal, not to adopt the stray back onto the menu, because a row the person deleted should not come back by itself.

## Phase 204: an account you signed into is an account you can go back to

**What the phase was.** Tortie keeps a copy of every account it sees in a vendor store and offers it back by name, so typing `/login` inside a session no longer loses the account that was there. The highest risk phase in the login work, because it writes credentials. Landed at `b53f2c6`.

**What went wrong.** The first verification found two blocking defects and three smaller ones. Opening the Agents page issues more than one list at once, and two overlapping reads of the record file destroyed the row for a kept account, so Tortie held the account and offered it to nobody; the phase's own app run was red because of it. The capture of an outgoing account required both the old and the new store to name an address, so on three real shapes, including a login that had not yet taken a turn, `/login` silently destroyed the kept account. A crash between the staging step and the commit step left a whole credential in a staging file. The second verification found one more blocking defect: a symbolic link planted at the name a write stages to made Tortie write a credential straight through the link into any file it named, including one standing in for the person's own codex store. The read back check read through the same link and passed. That defeated the phase's central refusal.

**How the verifier found it.** Round one: re-derivation by its own overlap probe, which reproduced the lost row; attack with 17 hostile shapes; real data, 12 real kills at each of three points in the write; parent commit measurement. Round two: attack with a planted link, the shape no gate fixture had, because the gate's other arms run over a bag of strings and strings have no links in them. That is how the defect survived eighteen ablations.

**How it was fixed and why.** The fix round reproduced all five findings before editing. `839407b` puts every observe and forget under one lock per logins root and re-reads the record file immediately before each write. `2e5042e` keeps an account unless it is proved to be the same one, using a stable identity that is compared and never drawn. `f9bdb01` sweeps leftover staging on the first observe of a run. `9010a84` fixed a defect in the fix round's own guard. `5500fe4` corrected the documented timings. The committer re-derived the link finding and fixed it in `b53f2c6`: unlink first, then create exclusively so a re-planted link fails rather than being followed, and ask the rename the same question, at all four write sites. `npm run conformance:credentials` gained the one arm that uses real files and real links. Recorded and not fixed here: the sweep did not reach Tortie's own vault, fixed in Phase 206 at `1292c3c`; and a link planted at the store path itself is still read through on the observe side.

## Phase 206: the fourth nits round, and the stray on his disk

**What the phase was.** Five findings earlier phases had recorded rather than fixed, one commit each: a Remove that leaves a keychain item behind, a crash that leaves a credential staged in Tortie's own store, the font field refusing the whole invisible character category, an impossible manifest instant taking a page down, and a build gate that any script ending a process only on the happy path must fail. Landed at `664dea2`.

**What went wrong.** Two blocking findings. The phase's own app run was red while its commit body said it passed. The probe graded the font field's on screen text, which the settings page resyncs only when the stored value changes, so rows two onward could never read as cleaned whatever the sanitizer did. The sanitizer was correct; the evidence was not. Second, the new background gate went green on shapes the brief had named as must fail: a kill inside a finally block belonging to an unrelated inner function cleared the whole file, a file that ended one loop correctly and started a second ended nowhere read as green, and a loop or a detached flag held in a named constant was invisible. Smaller: a stray login with a vault slot but no folder was never swept; the vault's keychain items carried no profile scoping, so a scratch profile probe wrote to the operator's own keychain item, measured as its modification date moving; and the sweep only ran when a logins list was first opened, not at boot.

**How the verifier found it.** The one app run, run twice, red both times. Hostile fixture: 21 hostile scripts of its own against the gate, five of which walked past it. Attack plus parent measurement on three items; an independent re-derivation of the Unicode class from perl and python tables against node's ICU, over 4,208 inputs. The keychain finding came from reading the operator's keychain by attributes before and after each run, never the secret.

**How it was fixed and why.** The fix round reproduced all eight findings before editing and found one worse than reported: the reach into the keychain was a write that predated the phase, not only the delete it added. `e87fcc9` makes the probe grade what Tortie kept rather than what the field shows, and withdraws the false sentence explicitly rather than rewriting a landed commit. `7c31927` asks the gate's question per start, against the name each start is held under, with names read from every value assigned to them; the five escaping shapes became fixtures that must fail. `d0e8727` reads three indexes for sweepable slots so a slot outlives its folder. The write half of the keychain reach was deliberately not done in a nits round, because renaming a keychain service strands the item that exists, which was item 1's own defect; it became Phase 208. Recorded and not fixed: a hand edited logins record whose id is a number rather than a string makes the stray sweep delete that login whole. Tortie never writes that shape itself.

## Phase 205: the terminal behaves like a terminal

**What the phase was.** Three reported terminal defects: coming back to the window threw away where you had scrolled to, capture menu rows had the wrong icons, and a selection stopped growing the moment you scrolled. The second was refused on a measurement, because all four capture rows really do put a picture on the clipboard. Landed at `4943560`.

**What went wrong.** The new edge drag scrolled panes it should never touch. In a pane whose program had asked for the mouse, such as a picker inside an agent, holding a drag at the pane's edge scrolled the history from 0 to 106 lines, put the pane into copy mode, and painted a 43 line selection the program never asked for. The wheel had been kept out of those panes since Phase 12.3; the drag did not ask. Second, the wheel arm of the phase's own proof could not fail: all three of its conditions already held at the parent, and its fixture hand set a value the real drive never produces.

**How the verifier found it.** Attack: it drove a pane running a program that asked for mouse reporting and held the drag at its edge at both commits. Re-derivation: it read the scroll position from tmux rather than from the app, and read the menu from the shipped bundle rather than the source. Real data: one probe driven at both commits, twenty arms. It also found that nothing in the round had driven Apple's Terminal, so the claim that the panes match it was inference.

**How it was fixed and why.** `d6efcc4` reads whether the pane owns the mouse where the gesture begins and again on every edge tick, because a picker can open while the button is already down; a unit test proves each guard separately. The verifier's one line prescription would have covered only the first half. `4ee8fde` makes the wheel arm run the same drag twice and judge a length against a length, red on an ablated build. The running log at `4943560` says the Terminal comparison is his report and not a measurement; Phase 209 ran it for real.

## Phase 209: a selection you scrolled through copies all of it

**What the phase was.** The two ends of a selection are now line numbers in the session's history rather than cells on a screen, so a drag held at the edge copies every line it travelled, not the last screenful. It closes the one screen limit Phase 205 recorded. Landed at `5e36ccb`.

**What went wrong.** Six findings, none blocking, and three were wrong sentences in files that outlive the round. The header comment of the drag arithmetic said the absolute line holds still because history and position grow together; that is not what tmux does. One file still said the history cap was 50,000 after four others had been corrected to 25,000. And the stated limit did not admit that one copy is two tmux calls rather than one instant, so a very fast producer can shift the copy.

**How the verifier found it.** Real data: its own drive of the eight second hold at both commits, 43 lines copied at the parent against 717 at HEAD, and the Apple Terminal comparison Phase 205 could not run, driven with real events, with 534 whole lines byte identical between the two. Re-derivation: the history arithmetic over 100,000 random screens with zero mismatches, and three tmux measurements of its own, one of which showed the header sentence false.

**How it was fixed and why.** The committer re-derived the false sentence itself on a scratch tmux server before taking the verifier's word: with a pane printing in bursts, the scroll position stayed at 11 while the history grew from 21 to 51, so the stable thing is the absolute line. All three corrections are comment lines only, in `5e36ccb`; nothing executable moved. A duplicate build commit colliding with Phase 207 was answered by the rebase, which kept one copy at `c6250c9`. Recorded and not fixed: if Clear drops the history while a selection is held, copy does nothing silently, which matches the existing empty selection path.

## The phases with no verifier finding that led to a fix

Each line says what the verifier did instead, so a reader can tell nothing found from nothing looked for.

- **Phase 168, the glance strip at the top of the diagnostics report** (`c05e99b`, 0.86.0). Pass. The verifier took its own process snapshots and hand run `top` samples while the app captured, and re-derived the Together column, the machine ranking and the energy column with a script written from the charter. It scanned the copied text against the 25 largest app groups and attacked its one hit, which was its own scratch path. Two notes not fixed: no photograph of the strip exists, and the rank 1 wording of the machine sentence has no test.
- **Phase 169.1, the Oh My Pi mark goes monochrome** (`880e47d`). No verifier. The operator's own commit nineteen minutes after Phase 169 landed. A follow up docs commit `9e5eedd` fixed the icon header.
- **Phase 169.3, Catch Me Up reads Oh My Pi sessions** (`30a4ac5`). No verifier. The operator's own commit twenty minutes after Phase 169 landed, fixing a defect Phase 169's verification missed, described under Phase 169 above. There is no Phase 169.2.
- **Phase 171, the contract inventory is required** (`32ec650`, 0.88.1). Pass. The verifier counted the invoke channels with its own syntax walk, 215, byte for byte the baseline, planted one fake channel and watched the build go red naming it, and ran the parent's tests inside a sandbox denying `/bin/ps` to confirm the audit's claim. Four notes; the Catch Me Up flight latch one was a builder's find and became Phase 183.
- **Phase 174, a custom font family for the terminal and editor** (`4b350cd`, 0.89.0). Pass. The verifier drove 26 hostile strings through the real settings path and read them back from three real sinks; none escaped the font declaration. It measured `document.fonts.check` live to confirm the builder was right to abandon it. One note on the charter's wording, not fixed.
- **Phase 175.1, the switch turns off** (`93fcaf7`). No verifier and no workflow. The operator reported that Phase 175's switch could not be turned off, then withdrew it the same hour: his dev main process predated the landing, so the sanitizer that accepts the field had never run. The lesson kept is to reload the dev app before believing any settings defect.
- **Phase 179, crossings over the finer parts** (`ba9891c`, 0.90.0). Pass. The verifier wrote its own lexer, import resolver, prefix descent, PageRank and merge step blind to the shipped code and matched the shipped result pair for pair, then fed five hostile fixtures to the prompt composer and ran one real enrichment. Two notes: ten promises against the builder's nine is model variation, and one rule was checked by reading.
- **Phase 183, the Catch Me Up flight latch unsticks** (`e26ecaf`, 0.89.5). Pass. The verifier wrote its own frame starved harness without opening the builder's test, got the failure at the parent and a pass at the tip, and withheld frames inside the live renderer to prove a re-enter opened in 217 ms instead of being dropped.
- **Phase 189, project tabs stay readable when there are too many** (`f7d131f`). Approved. The verifier re-derived the tab name floor from painted pixels with its own PNG reader, attacked with twenty hostile names over nine widths at the parent `d2e4540` and the tip, and proved the new gate red against the real parent tree.
- **Phase 174.2, the custom font field sits level with its dropdown** (`7917485`). Approved. The verifier re-derived the vertical offset three ways the builder did not, all reading minus 9 pixels at the parent `bd79dba` and 0 at the tip, and attacked with a note sentence four times longer. Two advisories recorded and not acted on.
- **Phase 192, the skills sheet stops taking the whole window** (`2742c9e`). Approved. The verifier attacked the Install button hit test four ways, found the two column collapse by its own binary search, took the preview band to thirteen heights, and measured the parent with the same instrument. One note not fixed: a comment states a parent measurement in the present tense.
- **Phase 188.1, a corrupt timestamp must not stop the diagnostics pane** (`18a516b`). Approved. The verifier wrote its own 18 value fixture against the builder's six and ran each through the fixed builder, the parent builder and both renderer functions: the parent threw on 11 of 18, the fix on none. It named one exposed sibling call site in the overview's git mark reader, recorded as a known limit and fixed in Phase 206 at `9b47c2f`.
- **Phase 190, the four inline modes are three on a pure deletion** (`8cab959`). Approved. The verifier called the installed diff library itself in node over 16 fixture pairs, folded the parts two independent ways, and read the spans off the running app's shadow DOM with its own reader. Every count matched. Two silences it named, past the pair cap and past the line length cap, are disclosed in the module header.
- **Phase 195, the chrome stops contradicting itself** (`f29861f`). Approved. The verifier built the parent and HEAD, drove sixteen photograph probes at each, and decoded every picture with its own decoder: zero pixels moved on every picture but three, which held the one expected dot colour change. Two things noted for the record, neither a defect under the phase's rule.
- **Phase 196, the quiet frame** (`f58001e`). Approved. The verifier launched its own Electron at HEAD and at the parent, took its own screenshots, and computed every contrast ratio with its own arithmetic, never reading the token file for a number. Every row agreed with the builder to the last digit. One doc gap and one nit recorded.
- **Phase 207, the chrome takes the hue you choose** (`41f34a8`). Approved. The verifier re-derived the rotation of the eight neutrals with a hand written conversion and agreed byte for byte on all 2,880 colours, re-derived every pinned contrast ratio at 360 hues, and attacked the sanitizer with 24 hostile values. Two notes for the operator rather than the phase, described in the next section.
- **Phase 208, the vault reaches out of its profile** (`bdc0cf0`). Approved. The verifier ran the attack at the parent under node rather than in the app, because the app form would write his keychain: a scratch root composed his item's exact name and a plant moved its modification date; green at HEAD. It re-derived the digest by node and by python and attacked the migration five ways including two interruptions. It attributed the one move in his keychain during the round to his own dev app running parent code. Its recorded items are in the next section.

## What verifiers found that is still not fixed

These are named so nothing is quietly lost. None was rated blocking at the time.

- **Phase 170.** The live capture window printed in the header shrinks tick by tick and resets, because each window opens only after the previous finish waits for the stream's next block.
- **Phase 175.** Turning the Architecture switch off does not disarm a file watch armed while it was on.
- **Phase 181.2.** Eighteen scripts are missing from the Electron teardown list, pre-existing drift.
- **Phase 182.** The refusal to install a status line over the person's own is still a log line, not something a person is told on screen.
- **Phase 188.** A newline in a project name splits a pasted report line, and a narrow pane shows a horizontal scrollbar.
- **Phase 192.** A comment states a parent measurement in the present tense.
- **Phase 194.** Cmd-A from the Edit menu then Copy yields the interleaved redline text; ruled a known limit.
- **Phase 200.** The split profile still fails its renderer heap in one run of two at both commits, and nobody knows why.
- **Phase 202.** Add login creates an empty folder outside the root when the provider root itself is a link. The row is dropped at every later read, so it is bounded, but the one line fix and its fixture are owed.
- **Phase 204.** A link planted at the store path itself is still read through on the observe side; the write and rename sides are guarded.
- **Phase 206.** A hand edited logins record whose id is a number rather than a string makes the stray sweep delete that login whole. Tortie never writes that shape.
- **Phase 207.** At the shipped chroma the whole hue circle is subtle, and on the dark side of the text flip a colour that cannot reach its shipped ratio falls to pure black. Neither is reachable by any setting today.
- **Phase 208.** A home folder behind a symbolic link is refused the keychain migration silently; a delete that fails is counted as deleted; a bare second profile with no harness knob copies his credential into an item of its own, by design; and the gate goes red at the parent by crashing rather than by naming a rule.
- **Phase 209.** If Clear drops the history while a selection is held, copy does nothing silently.
