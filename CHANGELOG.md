# Changelog

Each commit appears once under Added, Changed or Fixed. Every bullet stays on one line so it renders cleanly on GitHub. Versions follow semantic versioning, and release pages use these entries verbatim.

The operator set the style on 2026-08-23 by rewriting every entry, and it binds every entry after. An item is one or two sentences. It says what a person can now do or what no longer goes wrong, in plain words, and then stops. A limit that a person will hit goes in the same item in one clause, e.g. "Saves have no undo", and a limit nobody will hit stays in the commit body. No measured numbers unless the number is the point. No build story, no file names, no gate names. The lead paragraph says what the release is about in two or three sentences and lists nothing.

## Unreleased

This release is about three things. A large Markdown document now shows its first screen at once and fills in the rest while you read, and the files you open now belong to the project you opened them in, so switching projects switches which files are in front of you without closing any of them. And with Architecture on, the map is now drawn from the repository itself: grouped by what it builds and starts, with what each part exposes and how far each part is proven, and an agent you have confirmed can be asked to say what each part is for.

### Added

- With Architecture on, the map now groups a repository by what it builds and starts, each package, program or service in its own frame with the wires between them named for what carries them, and every part wears a mark saying how far it is proven: declared, composed, reached from something that starts, or tested. Click a part and the panel below the map says what it exposes, what it writes and what guards it, a Surfaces tab lists every route, command and channel the code declares, and a Gates worksheet counts the checks in front of them, all read from the code with no model in the loop; the map still does not say what a part is FOR ([`62ab3918`](https://github.com/gregce/tortie/commit/62ab3918))
- With Architecture on, you can now ask the agent you confirmed in Settings to read a repository and say what each part is FOR, in a sentence per part, with the steps a piece of work takes through it and the reasons work stops. Every sentence carries the lines it was found at, each marked with what sits there and how rare that is to hit by chance, and a sentence whose line has moved is marked stale rather than quietly redrawn — though a mark only says a fact was found near a claim, never that the claim is true ([`ff5b413c`](https://github.com/gregce/tortie/commit/ff5b413c)), ([`b5cd92ff`](https://github.com/gregce/tortie/commit/b5cd92ff)), ([`ac27f8d9`](https://github.com/gregce/tortie/commit/ac27f8d9))

### Changed

- The files you open now belong to the project you opened them in: switch projects and only that project's files are on the strip, with the rest hidden rather than closed, so their unsaved edits, their undo and a rewind's undo are all still there when you switch back. Closing a project closes its files, and asks about any unsaved one first ([`8e5a5f43`](https://github.com/gregce/tortie/commit/8e5a5f43)), ([`721b35c6`](https://github.com/gregce/tortie/commit/721b35c6))
- A large Markdown preview now shows its first screen at once and fills in the rest as you read, so a big file opens rendered again instead of in Source. A file that begins with one enormous table, or a large one with footnotes, still opens in Source with Preview one click away, and a jump to a heading far down the page reaches it once the page has finished filling in ([`6d754c9b`](https://github.com/gregce/tortie/commit/6d754c9b)), ([`ef8c4464`](https://github.com/gregce/tortie/commit/ef8c4464))

## 0.103.0 (2026-09-10)

This release is about clicking a file an agent named. A path printed into a session underlines when you point at it and opens when you click it — absolute or relative, mid-sentence or at the end of the line, and a bare filename too. The redline has been given the room to read like a marked-up document rather than a stack of tiles, a wide table in a preview takes the room its content needs, and a large prose file opens at once instead of after seconds.

### Added

- A file an agent names in a session is now a link: point at it and it underlines, click it and it opens where it belongs — prose and code in the editor, a picture in the image view, and a PDF, which Tortie cannot draw, in whatever your Mac opens PDFs with. A path that runs off the right edge of the pane is left alone, because where it ends is not known, and a session running on another machine offers no file links at all ([`b3d042e`](https://github.com/gregce/tortie/commit/b3d042e)), ([`d461678`](https://github.com/gregce/tortie/commit/d461678)), ([`4094a36`](https://github.com/gregce/tortie/commit/4094a36)), ([`7d1a9c2`](https://github.com/gregce/tortie/commit/7d1a9c2)), ([`28876d5`](https://github.com/gregce/tortie/commit/28876d5))
- Nothing that could run is ever offered, whatever it is called: a file with the executable bit set, an application, or a folder wearing a picture's name. Neither is a file whose name says it holds a secret, which now covers auth.json, .npmrc, .git-credentials and their family as well as the dotenv and key files it already covered ([`4094a36`](https://github.com/gregce/tortie/commit/4094a36)), ([`110de49`](https://github.com/gregce/tortie/commit/110de49))
- A path printed at the end of a line is a link too. It used to be left alone along with paths that run off the right edge of the pane, and the end of a line is where an agent almost always writes one; a path that really does run off the edge is still left alone ([`d810c33f`](https://github.com/gregce/tortie/commit/d810c33f))
- So is a path written relative to the project, which is most of what an agent prints: it opens the file under the project that session is in. A name that resolves outside that project is left alone, a relative name is never handed to your Mac so a PDF named that way opens nothing, a session running on another machine still offers no file links at all, and a name printed by an agent working in another copy of the same project can open that file in the wrong copy ([`286f7eec`](https://github.com/gregce/tortie/commit/286f7eec))
- A path with its line written the ways tools actually write it now clicks too: grep's path:12:matched text, a compiler's path(12,34) or path[12], and a name with square brackets in it such as pages/[slug].tsx. Only the path and its line are underlined, never the matched text after them ([`b62e277c`](https://github.com/gregce/tortie/commit/b62e277c))
- A bare filename with no slash in it — README.md, Makefile, package.json — is a link as well now, opened under the project that session is in. A plain word, a version number and a dotfile are never links, a name that matches no file there underlines nothing, and a path wrapped onto a second line of the pane is still left alone, because the pane cannot say where it began ([`b62e277c`](https://github.com/gregce/tortie/commit/b62e277c))

### Changed

- A redline now reads in a column wide enough for prose, and a marking that wraps onto a second line is drawn as one continuous passage instead of a row of separate tiles. The change you are standing on is shown by a bar in the margin rather than an outline around every fragment of it, and Accept all and the count of changes line up with your text — on a narrow pane the controls go back over the prose, because there is nowhere beside it for them to sit ([`08d1dc38`](https://github.com/gregce/tortie/commit/08d1dc38)), ([`87eace90`](https://github.com/gregce/tortie/commit/87eace90))
- A table in a redline is marked row against row now, so renaming a column shows the words that changed instead of striking the whole table through and repeating it. A table over about four thousand characters still gets no redline at all ([`01fca241`](https://github.com/gregce/tortie/commit/01fca241)), ([`553117a0`](https://github.com/gregce/tortie/commit/553117a0))

### Fixed

- A wide table in a Markdown preview now takes the width of the pane rather than the width of the reading column, so columns that used to be cut off with nothing on the page to say they were there can be read. Code blocks do the same, and a table too wide even for that still scrolls sideways in its own box, with a scrollbar you can now see ([`b3c11951`](https://github.com/gregce/tortie/commit/b3c11951)), ([`8ff5ca1d`](https://github.com/gregce/tortie/commit/8ff5ca1d))
- A wide block in a preview now takes only the width its content needs, where before it always took the widest box the pane allowed and drew mostly empty inside its own border. A short block still fills the reading column exactly as before ([`56c754ef`](https://github.com/gregce/tortie/commit/56c754ef))
- A blank line added or removed in a redline is now marked. It used to be drawn as nothing at all, while still offering Rewind and Accept on a change there was no way to see ([`08d1dc38`](https://github.com/gregce/tortie/commit/08d1dc38))
- A large Markdown file now opens at once, where it used to hang for seconds while the whole rendered page was built before anything appeared. Past about a quarter of a megabyte the file opens in Source with Preview one click away on the mode chip, which says what that click will cost; a smaller file still opens rendered exactly as before ([`f163d942`](https://github.com/gregce/tortie/commit/f163d942))

## 0.102.0 (2026-09-09)

This release is about the redline you can rewind, accept and now type in. Every edit to a prose file shows up as a marking against what the file was, whether git has noticed it or not, and a change you point at either goes back with one key or stops being marked with another, without the file being touched. The editor answers a right click now too, and saving a file somebody else has written to asks you first.

### Added

- The Redline tab for a Markdown or text file now marks every change since the last commit, or since you opened the file when it is not in git. It redraws by itself when an agent writes to the file, and it waits while you have unsaved edits ([`8e036fc`](https://github.com/gregce/tortie/commit/8e036fc)), ([`f41a5e3`](https://github.com/gregce/tortie/commit/f41a5e3)), ([`94e21c6`](https://github.com/gregce/tortie/commit/94e21c6))
- Point at a change in the redline with Option-Down and Option-Up, press Option-Delete, and that one phrase goes back to what it was while every other edit in the file stands. Your own paragraph carries the same control as an agent's, so a rewind can be undone with Shift-Option-Delete for as long as the tab is open ([`fd7ea6c`](https://github.com/gregce/tortie/commit/fd7ea6c)), ([`d9590ea`](https://github.com/gregce/tortie/commit/d9590ea)), ([`1cb818e`](https://github.com/gregce/tortie/commit/1cb818e)), ([`d9ac372`](https://github.com/gregce/tortie/commit/d9ac372))
- A rewind is written only if the file still holds exactly what Tortie read when you pressed. If something wrote to it in between, or the phrase is no longer there, nothing is written and the redline says which, though a write of exactly the same size landing in the same instant as the rewind can still be written over ([`71fa4f8`](https://github.com/gregce/tortie/commit/71fa4f8)), ([`389a47f`](https://github.com/gregce/tortie/commit/389a47f))
- The redline now says what its keys are. Point at a change, or step to it, and a small panel appears beside it offering Rewind with the keys written next to it, and the Edit menu shows the same keys and is available only while a redline is open, though Undo there always means the last rewind in the tab rather than the change you are pointing at ([`74a3a79`](https://github.com/gregce/tortie/commit/74a3a79)), ([`c7948fa`](https://github.com/gregce/tortie/commit/c7948fa)), ([`dd2c8a2`](https://github.com/gregce/tortie/commit/dd2c8a2)), ([`7b9e090`](https://github.com/gregce/tortie/commit/7b9e090))
- A redline with nothing marked now says so, and says what it is being compared against — the last commit, or for a file git does not know about, the time you opened it — so an empty page is no longer mistaken for one that has not loaded ([`4de50a2`](https://github.com/gregce/tortie/commit/4de50a2))
- You can type in the redline now, so a typo you notice while reading a file no longer means switching to Source to fix it and switching back. What you type is drawn as an insertion like any other change, Command-Z takes it back, and Command-S writes the file — though a save writes what is in front of you over anything an agent wrote to that file while you were typing ([`0722478`](https://github.com/gregce/tortie/commit/0722478)), ([`fd70048`](https://github.com/gregce/tortie/commit/fd70048)), ([`ff9d817`](https://github.com/gregce/tortie/commit/ff9d817)), ([`cbf192d`](https://github.com/gregce/tortie/commit/cbf192d))
- A change you agree with can now be accepted instead of rewound. Press Option-Return on it, or Accept all at the top of the redline, and it stops being marked without a byte of the file being written — though accepting ends the undo of any rewind you made before it ([`7a91726`](https://github.com/gregce/tortie/commit/7a91726)), ([`eea8ec8`](https://github.com/gregce/tortie/commit/eea8ec8)), ([`f044001`](https://github.com/gregce/tortie/commit/f044001)), ([`225958d`](https://github.com/gregce/tortie/commit/225958d))
- Right-clicking in the editor now opens a menu, where it used to do nothing at all. It carries the ordinary editing rows along with Find, Change All Occurrences, Go to Line, Fold and Unfold, and History, Copy Path, Copy Relative Path and Save for the file you are in ([`808da33`](https://github.com/gregce/tortie/commit/808da33)), ([`80b32c7`](https://github.com/gregce/tortie/commit/80b32c7))
- What you accept in a redline now outlasts the tab. Close the file, reload the window, or quit and come back, and the marking is still narrowed to what changed since you accepted, with the day it was taken written beside it — what is kept is the marking and never a copy of your text, and it lasts until the file's committed version changes, or a week after you accepted, when the redline goes back to marking every change since the commit ([`b6307d3`](https://github.com/gregce/tortie/commit/b6307d3)), ([`51d9029`](https://github.com/gregce/tortie/commit/51d9029)), ([`8a6c3a1`](https://github.com/gregce/tortie/commit/8a6c3a1)), ([`d5adb0b`](https://github.com/gregce/tortie/commit/d5adb0b))
- A markdown table under your cursor can be tidied from that menu, and a wall of one-line JSON pretty-printed or squashed back onto one line, over what you have selected or wherever the cursor is, and one Command-Z takes any of them back. A table with a row wider than its header is refused with the line named rather than reflowed, and JSON is left alone if formatting it would change anything other than the spacing ([`ebdaab6`](https://github.com/gregce/tortie/commit/ebdaab6)), ([`7701c0c`](https://github.com/gregce/tortie/commit/7701c0c)), ([`bee4e01`](https://github.com/gregce/tortie/commit/bee4e01))

### Changed

- The redline's controls now belong to the change you are on rather than to your pointer: they stay put while you read, while you type in that change, and while an agent writes to the file, and they move with the change when the file reflows underneath them. Clicking anywhere else in the text puts them away, and Undo has left the panel for the line that already says it means the last rewind in the tab ([`e8bfa9a`](https://github.com/gregce/tortie/commit/e8bfa9a)), ([`6799432`](https://github.com/gregce/tortie/commit/6799432)), ([`9bcdfaf`](https://github.com/gregce/tortie/commit/9bcdfaf)), ([`10c4093`](https://github.com/gregce/tortie/commit/10c4093))

### Fixed

- Saving a file that changed on disk while you were typing no longer writes over it in silence. Tortie says so and offers three answers: Compare, which opens the two versions side by side, Cancel, or Overwrite, which is never the default. Overwriting is checked again as you press it, so a write that arrives while the question is on screen is caught as well ([`067f0a01`](https://github.com/gregce/tortie/commit/067f0a01)), ([`12bcca4a`](https://github.com/gregce/tortie/commit/12bcca4a)), ([`c7c1203c`](https://github.com/gregce/tortie/commit/c7c1203c))
- A file that is a symbolic link, and a file outside your open projects such as a global CLAUDE.md, are asked about too. They are checked a moment before they are written rather than as they are written, so a write that lands in that moment is still lost ([`96f6d634`](https://github.com/gregce/tortie/commit/96f6d634))
- A save that cannot happen now says why, whether the file is read-only, gone, too large, in a project you have closed or not text Tortie can rewrite without damaging it. It used to say the same sentence twice and name no cause ([`c7c1203c`](https://github.com/gregce/tortie/commit/c7c1203c)), ([`96f6d634`](https://github.com/gregce/tortie/commit/96f6d634))
- A file that is not plain UTF-8 text is no longer told that something wrote to it when nothing did. It says the file is not text Tortie can rewrite, and it leaves every byte where it was ([`96f6d634`](https://github.com/gregce/tortie/commit/96f6d634))
- Every kind of file now gets the same question and the same second look: a file in a project, a symbolic link, a file outside your open projects, or one that grew too large to read while you were typing. Overwrite is checked again as you press it whichever kind it is, though a write of exactly the same size landing in the same instant as the save can still be written over ([`a40282ed`](https://github.com/gregce/tortie/commit/a40282ed))
- Tortie now signs in to your machines side by side when it starts, so a machine that is off or asleep no longer holds up the one that answers, though a fifth machine waiting behind four that do not answer still waits for them. A machine that did not answer at launch is asked again on its own, first after half a minute and then less often up to every five minutes, and at once when it starts answering ([`2df65516`](https://github.com/gregce/tortie/commit/2df65516)), ([`039cc213`](https://github.com/gregce/tortie/commit/039cc213))
- The bar saying a machine could not be reached now appears on that machine's own tab only, and no longer on another machine's tab or on a local one ([`87783605`](https://github.com/gregce/tortie/commit/87783605))
- A tab whose machine did not answer now carries Prepare this machine, the same control Settings has, so you can reconnect from where you are ([`882b3484`](https://github.com/gregce/tortie/commit/882b3484)), ([`da18d0a6`](https://github.com/gregce/tortie/commit/da18d0a6))
- A symbolic link inside the folder you let Tortie save under is no longer a way out of it. A save, a new folder or a rename aimed through one is refused and says so, where before it could replace a file outside that folder and tell you it had saved — and the Stage and Commit buttons refuse through one too, where before they acted on whatever the link really pointed at and said the work was done — though a link that points back inside that folder is refused as well ([`b3550212`](https://github.com/gregce/tortie/commit/b3550212)), ([`fa89813f`](https://github.com/gregce/tortie/commit/fa89813f))
- The two messages you get when Tortie cannot write on a machine now send you to the right place. They used to tell you to confirm a machine you had already confirmed, when what was missing was the folder ([`aa1dd69b`](https://github.com/gregce/tortie/commit/aa1dd69b))
- The Architecture map now says when the picture it drew is only part of a folder. A repository too large to read in one pass was drawn as though it were the whole thing, with nothing on the picture to say otherwise ([`69a14370`](https://github.com/gregce/tortie/commit/69a14370))
- A picture opened from a machine no longer offers Reveal in Finder. The file is on that machine, so the row could only ever have opened a folder on this one ([`3d17478f`](https://github.com/gregce/tortie/commit/3d17478f))
- Dropping a picture into an agent on a machine now always lands in Tortie's own folder there. A name planted in that folder beforehand could send the picture somewhere else on that machine while Tortie reported it had arrived ([`29ee53c4`](https://github.com/gregce/tortie/commit/29ee53c4))
- Reopening a prose file no longer carries the last opening's rewind with it. Undo in a freshly opened tab could put back text from a session you had already closed, over what was in the file ([`c043c2b5`](https://github.com/gregce/tortie/commit/c043c2b5))
- Architecture on a machine now notices an edit that leaves a file the same size within the same second. Such a change was invisible for as long as the file stayed that way, so the picture could keep describing code that had already changed ([`c8a836bb`](https://github.com/gregce/tortie/commit/c8a836bb))
- Inserting a paragraph above one you had edited no longer makes the paragraph below look rewritten. The redline marks the word that moved and draws the new paragraph once, where before it struck the whole paragraph through and then repeated it in green with nothing marked at all — though a paragraph you rewrote rather than edited still shows as the old one struck through and the new one after it, because there is no single word left to mark ([`ea2e6750`](https://github.com/gregce/tortie/commit/ea2e6750))

## 0.101.0 (2026-09-07)

This release is about light mode. The whole app can now sit on paper rather than graphite, terminal and editor and diffs included, and the frame controls work the same way on both. A codex session you restore after a reboot now opens instead of refusing, and a development build no longer disagrees with the installed app about which tmux to use.

### Added

- Tortie can run light. Settings then Appearance offers Light, Dark or Match the Mac, and the terminal, the editor, the diff view, the Architecture map and the window itself all follow. Switching is a crossfade, and it is instant if you have reduced motion turned on ([`4ab4400`](https://github.com/gregce/tortie/commit/4ab4400)), ([`419bc5f`](https://github.com/gregce/tortie/commit/419bc5f)), ([`4564106`](https://github.com/gregce/tortie/commit/4564106))
- The colour and depth controls work on light as they do on dark, and a control that cannot move on the base you are using is simply not shown. A shade you chose on dark comes back when you choose Dark again ([`a5a846a`](https://github.com/gregce/tortie/commit/a5a846a))
- Settings now says why the Claude usage meter is polling, so a meter that is working is not mistaken for one that is stuck ([`2f96be2`](https://github.com/gregce/tortie/commit/2f96be2))
- The repository carries a costing of what shipping Tortie on Linux and Windows would take, written to be read rather than filed ([`4e1b98c`](https://github.com/gregce/tortie/commit/4e1b98c))

### Fixed

- Restoring a codex session after a reboot now opens the conversation you actually had. It could name one of that session's sub-agents instead, which codex refuses to resume; rows already stored that way are repaired once, and a row whose parent cannot be found is left alone rather than guessed at ([`ac13925`](https://github.com/gregce/tortie/commit/ac13925)), ([`f2acc9e`](https://github.com/gregce/tortie/commit/f2acc9e))
- A development build and the installed app now run the same tmux, so they can no longer disagree about a session server after a restart. If they ever do, the message says which app started the server and what to run ([`1bd4094`](https://github.com/gregce/tortie/commit/1bd4094)), ([`dfea858`](https://github.com/gregce/tortie/commit/dfea858))
- The idle and ended session dots are readable on every frame colour you can choose. On some of them they were too faint against the selected row ([`c38b4d4`](https://github.com/gregce/tortie/commit/c38b4d4))
- In the git graph on light, six branches side by side stay distinguishable to a colour-blind reader ([`065d41e`](https://github.com/gregce/tortie/commit/065d41e))
- Clearing a session while text is selected no longer copies nothing in silence — the selection goes with the history ([`4564106`](https://github.com/gregce/tortie/commit/4564106))
- One very long session name no longer stretches the diagnostics table, and the live capture window is the interval it says it is ([`c7b9b8b`](https://github.com/gregce/tortie/commit/c7b9b8b)), ([`91212ae`](https://github.com/gregce/tortie/commit/91212ae))
- Adding a login refuses a folder reached through a link, and a login record Tortie did not write no longer authorises anything to be swept away ([`4a4823d`](https://github.com/gregce/tortie/commit/4a4823d)), ([`9a94ff9`](https://github.com/gregce/tortie/commit/9a94ff9))
- Choosing another account now reports what actually happened, including when a running session could not be checked. Quitting settles credential work rather than abandoning it mid-write, and removing a login during a quit no longer stops half-done ([`e1a1359`](https://github.com/gregce/tortie/commit/e1a1359)), ([`ff60e49`](https://github.com/gregce/tortie/commit/ff60e49)), ([`2ff1c5d`](https://github.com/gregce/tortie/commit/2ff1c5d))
- Migrating a stored credential says why it refused when it refuses, and counts only the deletions that really happened ([`b3c3a80`](https://github.com/gregce/tortie/commit/b3c3a80))

## 0.100.0 (2026-09-03)

This release is about the account a session runs on and the frame around it. Choosing another account now reaches a session that is already running, and signing in inside a session is noticed the moment it finishes. The frame can take a colour of your own, darker or lighter, and a selection you scrolled through now copies all of it.

### Added

- Choosing another account for a session that is already running now reaches that session. Claude Code picks the change up on its own within about half a minute, and a Restart now control beside the card restarts the session with its conversation kept if you want it at once. This includes your own default sign in, which Tortie now writes when you ask it to, keeping a copy of the account it replaces first ([`5643dd3`](https://github.com/gregce/tortie/commit/5643dd3)), ([`42ebeca`](https://github.com/gregce/tortie/commit/42ebeca)), ([`1c378d1`](https://github.com/gregce/tortie/commit/1c378d1))
- Signing in as another account inside a session, with the vendor's own `/login`, is seen the moment it finishes. The card, the menu, the Settings list and the meter refresh on their own, and the account you left stays on the list ([`e399a0b`](https://github.com/gregce/tortie/commit/e399a0b)), ([`b084880`](https://github.com/gregce/tortie/commit/b084880))
- The frame around your work takes a colour of your own. Settings then Appearance offers eight named colours, each drawn as the frame it will produce, and the terminal, the editor and the window itself follow it ([`cfc5711`](https://github.com/gregce/tortie/commit/cfc5711)), ([`7be6221`](https://github.com/gregce/tortie/commit/7be6221))
- Beside the colour, Shade moves the whole frame darker or lighter and Depth sets how far the panels and hairlines stand apart from the background. When a step would make text or the file colours unreadable the slider stops and says which other control would allow it. The lightest frame is a charcoal, not grey or white ([`787894e`](https://github.com/gregce/tortie/commit/787894e)), ([`5b7f57f`](https://github.com/gregce/tortie/commit/5b7f57f))
- Architecture now reads imports in Java, PHP, C, C++ and C sharp as well as the languages it already knew, and a name a repository declares for itself is never mistaken for somebody else's ([`2f6b931`](https://github.com/gregce/tortie/commit/2f6b931)), ([`f4aaa12`](https://github.com/gregce/tortie/commit/f4aaa12)), ([`6197a8b`](https://github.com/gregce/tortie/commit/6197a8b)), ([`3db2b61`](https://github.com/gregce/tortie/commit/3db2b61)), ([`a2df598`](https://github.com/gregce/tortie/commit/a2df598))
- The repository now carries a plain language account of what independent verification found across the last fifty rounds of work, and how each finding was fixed ([`4a8b510`](https://github.com/gregce/tortie/commit/4a8b510))

### Changed

- A second copy of Tortie on the same Mac, such as one run for a test, now keeps its own copies of your accounts and cannot reach the ones your own copy keeps ([`5fb1665`](https://github.com/gregce/tortie/commit/5fb1665)), ([`538ba25`](https://github.com/gregce/tortie/commit/538ba25))

### Fixed

- Copying a selection you extended by scrolling now copies all of it, not just the part that was on screen. Capture Selection keeps the last thousand lines of it ([`65272fa`](https://github.com/gregce/tortie/commit/65272fa)), ([`6b5c364`](https://github.com/gregce/tortie/commit/6b5c364)), ([`d63fa4c`](https://github.com/gregce/tortie/commit/d63fa4c))
- Scrolling up in a session and switching to another app no longer loses your place when you come back ([`b2778ee`](https://github.com/gregce/tortie/commit/b2778ee))
- A selection keeps growing as you drag past the top of the screen, and a program that asked for the mouse, such as a picker, keeps it instead of the pane scrolling ([`3ba0a60`](https://github.com/gregce/tortie/commit/3ba0a60)), ([`d6efcc4`](https://github.com/gregce/tortie/commit/d6efcc4))
- Removing a login now removes everything it kept, including its entry in the keychain ([`c7a51c3`](https://github.com/gregce/tortie/commit/c7a51c3))
- A crash in the middle of a switch can no longer leave a copy of a credential where nothing would clean it up ([`1292c3c`](https://github.com/gregce/tortie/commit/1292c3c))
- A session with an impossible timestamp in its record no longer takes a project's Catch Me Up page down ([`9b47c2f`](https://github.com/gregce/tortie/commit/9b47c2f))
- The font family field now refuses every invisible character, not only the ones it knew about ([`b5c2523`](https://github.com/gregce/tortie/commit/b5c2523))

## 0.99.0 (2026-09-02)

This release is about following things back. A file can be traced through every commit that touched it, even across renames, and the commit list narrows as you type. You can also keep more than one Claude or Codex account now and move between them from the meter, without signing in again.

### Added

- Right click a file and choose History, or use View then File History, to see every commit that touched the file you have open, followed back through its renames. Choosing a row shows that commit's change to the file. Merge commits are not listed ([`d2b5067`](https://github.com/gregce/tortie/commit/d2b5067))
- A field at the head of the History section narrows the commit list as you type. A bare word searches messages, and `author:`, `message:`, `commit:` and `file:` narrow further. `change:` searches inside the changes themselves and waits for you to press Search, because it is slow on a large repository ([`11a6366`](https://github.com/gregce/tortie/commit/11a6366))
- Every part of the Architecture map now says what it is in a sentence, and the sidebar reads from the repository down to the contract. Architecture is still off until you turn it on in Settings ([`5fe4f0a`](https://github.com/gregce/tortie/commit/5fe4f0a))
- You can add a second Claude or Codex account and choose which one your next session runs under, from the usage meter. Adding one opens a session running the vendor's own sign in, and Tortie never asks you for a password or a token ([`8773a3a`](https://github.com/gregce/tortie/commit/8773a3a))
- Each login is drawn as the account it is, by email address, with your own sign in marked as the one Tortie does not own ([`93eb4f3`](https://github.com/gregce/tortie/commit/93eb4f3))
- An account you have signed into is one you can go back to. Switch away, or sign in as someone else inside a session, and the account you left is still on the list and one click away. Sessions already running keep the account they started with ([`b53f2c6`](https://github.com/gregce/tortie/commit/b53f2c6))
- The diff's inline control now tells you which of its modes can actually differ on the change in front of you, instead of offering four that draw the same thing ([`8cab959`](https://github.com/gregce/tortie/commit/8cab959))

### Changed

- The window chrome steps below your work rather than competing with it, and the sizes, spacings and radii across the app now come from one scale ([`f58001e`](https://github.com/gregce/tortie/commit/f58001e)), ([`f29861f`](https://github.com/gregce/tortie/commit/f29861f))

### Fixed

- Select all in a redline now copies the document rather than the window around it ([`fc562a6`](https://github.com/gregce/tortie/commit/fc562a6))
- A font family name can no longer carry an invisible character that changes how it reads ([`57fe757`](https://github.com/gregce/tortie/commit/57fe757))
- A session name containing a line break stays on one row when you paste a diagnostics report ([`b5f0254`](https://github.com/gregce/tortie/commit/b5f0254))
- A selected or pressed row now has an edge you can see ([`1371500`](https://github.com/gregce/tortie/commit/1371500))
- Quitting now shuts the usage meter, the hook server and live diagnostics down as one operation, so nothing can be read or started again after the quit has finished ([`8ea7248`](https://github.com/gregce/tortie/commit/8ea7248))
- Turning on reduced motion no longer leaves a diff holding on to its rows after you close it ([`0929c6e`](https://github.com/gregce/tortie/commit/0929c6e))
- Creating a session on a machine whose tmux reports no server running is now read as the plain answer it is ([`cd338cb`](https://github.com/gregce/tortie/commit/cd338cb))

## 0.98.0 (2026-09-01)

This release is about reading a change the way you would read a document, and about the small things that make the window easier to live in. A changed text file can be read as a redline on its own, the usage meter follows your own turns, and a row of project tabs stays readable however many you open. A remote tab you close now stays closed.

### Added

- A changed text or markdown file can now be read as a redline. Choose Redline beside Diff and File and the whole document reads as prose, with the words that were removed struck through and the words that replaced them right after, and copying gives you the new text. It is for prose files, so a source file gets no Redline option ([`fe76ecd`](https://github.com/gregce/tortie/commit/fe76ecd)), ([`e238ff1`](https://github.com/gregce/tortie/commit/e238ff1))
- The usage meter now moves on every one of your Claude Code turns, at no cost to your plan, rather than only on its fifteen minute check. If you already have a status line of your own anywhere, Tortie leaves it alone and keeps the check ([`650b5b3`](https://github.com/gregce/tortie/commit/650b5b3)), ([`d878070`](https://github.com/gregce/tortie/commit/d878070))
- The sessions table in Diagnostics now names the project each session belongs to and how long ago it started and was last seen, so two sessions with the same name can be told apart ([`06fbe2c`](https://github.com/gregce/tortie/commit/06fbe2c))

### Changed

- Open more projects than fit along the top and the tabs scroll at a width you can still read, with a menu at the end that lists every project and its shortcut, rather than squeezing each name down to a letter ([`f7d131f`](https://github.com/gregce/tortie/commit/f7d131f))
- The Install a skill sheet is narrower, and its preview of the skill grows with a tall window instead of stopping at six lines ([`2742c9e`](https://github.com/gregce/tortie/commit/2742c9e))

### Fixed

- Closing a remote machine tab now closes it for good. It used to come back at least once ([`2e9650c`](https://github.com/gregce/tortie/commit/2e9650c)), ([`87e5533`](https://github.com/gregce/tortie/commit/87e5533))
- The custom font field in Settings sits level with the dropdown beside it ([`7917485`](https://github.com/gregce/tortie/commit/7917485))
- A session with an impossible timestamp in its record can no longer stop the live diagnostics report ([`18a516b`](https://github.com/gregce/tortie/commit/18a516b))

## 0.97.0 (2026-09-01)

This release is about knowing what your agents are doing and what they are costing you. Oh My Pi joins the supported agents, the diagnostics report answers at a glance instead of making you read it, and a meter on the sessions pane shows how much of your Claude and Codex plans you have used. Tortie also starts fewer things at launch, holds less memory under load, and lets you choose the font it writes your code in.

### Added

- Oh My Pi is now a supported agent. It launches, restores and resumes like every other agent, wears its own mark everywhere agents appear, and Catch Me Up reads its sessions. Contributed by [jakehildreth](https://github.com/jakehildreth) in [#12](https://github.com/gregce/tortie/pull/12) ([`d0e80a2`](https://github.com/gregce/tortie/commit/d0e80a2))
- A meter at the foot of the sessions pane now shows how much of your Claude and Codex subscription you have used, in both the five hour and the weekly window, with the detail on hover and a control to ask again. Each provider is off until you turn it on in Settings then Agents, and while a meter is off nothing is read and nothing is sent ([`16281b3`](https://github.com/gregce/tortie/commit/16281b3))
- The bar can track whichever window you care about, and it follows the number you read first unless you say otherwise. The card names the plan each login is on, and it no longer hides behind the tabs when your sessions sit along the top ([`1ea852c`](https://github.com/gregce/tortie/commit/1ea852c))
- You can now choose the font Tortie writes your code in, for the terminal and the editor together, either from three bundled faces or by naming any family installed on your Mac. Typing suggests the families you actually have. A captured session keeps a bundled face, and falls back to Menlo for the system font or for a family of your own. Contributed by [jakehildreth](https://github.com/jakehildreth) in [#13](https://github.com/gregce/tortie/pull/13) ([`4b350cd`](https://github.com/gregce/tortie/commit/4b350cd)), suggestions ([`9a19ddd`](https://github.com/gregce/tortie/commit/9a19ddd))
- The diagnostics report tells you what Tortie is costing in processes, memory, CPU and disk, and opens with a strip that totals it and ranks it against everything else running on your Mac ([`30222a1`](https://github.com/gregce/tortie/commit/30222a1)), ([`c05e99b`](https://github.com/gregce/tortie/commit/c05e99b))
- Every row in that report is now read rather than left blank, every table sorts by any column, and the numbers keep moving while you are looking at them ([`c01c013`](https://github.com/gregce/tortie/commit/c01c013))
- A diff now draws changes the way you want to read them. Choose whether a change is marked by word, by phrase, by character or not at all, and turn the full width colour on or off, from a row of controls in the diff itself. The choice is remembered ([`0a31afb`](https://github.com/gregce/tortie/commit/0a31afb))
- Architecture draws a map of a codebase, keeps a contract of what may depend on what, and can hand a part of it to a session as context. It ships turned off, and Settings then Architecture is where you turn it on, because most agents cannot fill in a contract yet ([`0586263`](https://github.com/gregce/tortie/commit/0586263)), ([`9b8a667`](https://github.com/gregce/tortie/commit/9b8a667)), ([`31f0afd`](https://github.com/gregce/tortie/commit/31f0afd))
- Architecture reads imports in Rust, Python, Ruby, Swift, Kotlin and Objective-C as well as the languages it already knew. Swift resolves between targets rather than between files, because a Swift target's files see each other with no import to read ([`b0f8c6e`](https://github.com/gregce/tortie/commit/b0f8c6e)), ([`5a75b54`](https://github.com/gregce/tortie/commit/5a75b54))

### Changed

- Tortie starts less at launch. A project you are not looking at no longer reads its git status until you look, and agent discovery waits for a surface that needs it ([`c32b9ef`](https://github.com/gregce/tortie/commit/c32b9ef))
- Screens you have not opened no longer load with the app, so the first window paints sooner ([`60a7093`](https://github.com/gregce/tortie/commit/60a7093))

### Fixed

- Catch Me Up no longer wedges if your screen locks while it is opening, which used to leave the chord dead until the window came back ([`e26ecaf`](https://github.com/gregce/tortie/commit/e26ecaf))
- A large uncommitted change no longer floods the Source Control view or the memory it holds ([`ad3de97`](https://github.com/gregce/tortie/commit/ad3de97))
- Sessions no longer leak a file handle each time one closes, which used to eat the machine's supply over a long day ([`ad3de97`](https://github.com/gregce/tortie/commit/ad3de97))
- Tortie no longer lets its own browser cache grow without a limit during development ([`ee02531`](https://github.com/gregce/tortie/commit/ee02531))
- Boxes in the Architecture map are clickable again, and clicking one drills into it ([`7efd14f`](https://github.com/gregce/tortie/commit/7efd14f))
- A file under a project's contract directory that Tortie cannot read is now skipped with one calm line instead of a wall of errors ([`6032c94`](https://github.com/gregce/tortie/commit/6032c94))
- The Architecture panel says plainly when it can read only part of a repository, and it no longer counts checks as promises when there are none ([`cde6566`](https://github.com/gregce/tortie/commit/cde6566))
- Remote machines are covered by their fault tests again, after those tests had been red long enough to stop meaning anything ([`4b8427b`](https://github.com/gregce/tortie/commit/4b8427b))

## 0.76.1 (2026-08-26)

This release is about the file tree and the menus. You can now bring files into a project from Finder and take them back out again, every menu row carries an icon and says which key runs it, and a session will tell you which conversation it is and where that conversation lives on disk. Several things you reported along the way no longer go wrong.

### Added

- You can now drag a file, several files or a whole folder from Finder onto the file tree and it lands inside the folder row you aimed at, or at the project root over the empty space below the rows. The original stays where it was because this is a copy, a name that already exists asks you first and names every collision at once, and Replace moves the displaced entry to the Trash so it is recoverable. Dragging a folder onto the file tree now brings it into the project instead of opening a new project tab, though a folder dropped anywhere else in the window still opens one, and a project on another machine refuses the drop with a sentence rather than appearing to work ([`29ff027`](https://github.com/gregce/tortie/commit/29ff027))
- Hold Option and drag a row out of the file tree to hand that file to Finder, or to any other app that takes a file ([`29ff027`](https://github.com/gregce/tortie/commit/29ff027))
- A session's actions menu now shows the agent's own conversation id, which is what resume takes, the file that agent keeps the conversation in, and Tortie's own id for the session last. Each one shows its value as well as copying it, so the menu is a place to read an identifier rather than only to copy one, though a shell session has none of these and Factory Droid CLI keeps no record to point at ([`4b6247d`](https://github.com/gregce/tortie/commit/4b6247d))
- Every row in a right click menu now carries the icon its own part of the product already uses ([`c25d16d`](https://github.com/gregce/tortie/commit/c25d16d))
- The menu bar along the top of the screen and the menu behind the cat in the status bar now carry those same icons, and every row that has a keyboard shortcut says what it is ([`3c3ea84`](https://github.com/gregce/tortie/commit/3c3ea84))

### Fixed

- A file you drop into the tree now appears immediately, and the Refresh button at the top of the Explorer re-reads the folder every time you press it ([`f1562d3`](https://github.com/gregce/tortie/commit/f1562d3))
- Running a build or a test suite in a project no longer floods Tortie with dropped file events, and when the system does drop a batch Tortie re-reads what it missed instead of quietly showing you a stale tree. A folder the repository ignores is no longer watched at all, so a change inside one will not appear until something else in the project changes ([`ef1c497`](https://github.com/gregce/tortie/commit/ef1c497))
- The icons down the left edge now light up under the pointer, so you can tell what you are about to press ([`33f5593`](https://github.com/gregce/tortie/commit/33f5593))
- Narrowing the session list no longer pushes its add button and chevron off the edge, because the word SESSIONS shortens instead, and at the narrowest width it goes entirely ([`33f5593`](https://github.com/gregce/tortie/commit/33f5593))
- The confirm sheet for installing a skill is now about twice as wide, so the command it is asking you to approve reads on one line instead of three ([`33f5593`](https://github.com/gregce/tortie/commit/33f5593))
- The empty state is quieter, and the Explorer, Source Control and Context views now share one set of text sizes instead of each choosing its own ([`fa590ea`](https://github.com/gregce/tortie/commit/fa590ea))

## 0.73.0 (2026-08-25)

This release is about picking work back up and reading it back. An agent that ends inside a surviving shell can be resumed on the spot, and every session's one line summary now keeps a history you can open from its row in the project view. Quitting and cloning a project to a remote machine both got safer along the way.

### Added

- End an agent by hand and, if its shell survives, Resume appears on that session's row within about a second, and pressing it types the resume command onto your prompt for you to send, re-adopting the session only when the agent confirms it is the same conversation. Nothing here survives a restart of Tortie, a restored session never shows the verb, Claude Code and Antigravity CLI confirm unaided, every other agent confirms once you send the pasted command, though Pi can never be confirmed and Factory Droid CLI never shows Resume at all ([`b4f0fc9`](https://github.com/gregce/tortie/commit/b4f0fc9))
- You can now press story on a session's row in the project view and read every version of that session's one line summary, newest first, each with its time, and pressing a version shows the turns it covered. Repeated lines collapse into one row, a change of model is named where it happened, and a session whose line never changed shows just that one line, though until you choose a model for the one line summaries the page says there is no story to read ([`75a5298`](https://github.com/gregce/tortie/commit/75a5298))
- The current release's installer is now always available at one download link that never changes, so a page can point at the latest version without naming it. The in-app updater is unaffected ([`b2442f5`](https://github.com/gregce/tortie/commit/b2442f5))

### Changed

- The story control is now the one word story at the far right of each session's row in the project view, sitting in one shared column, and it opens that session's timeline in place, one session at a time with no rolled up story for the project. The conversation view no longer carries the story control, so it is purely the word for word record ([`8443052`](https://github.com/gregce/tortie/commit/8443052))
- Your asks in Catch Me Up now carry a light accent glow so your eye finds them among the answers, and the top band's collapse and position controls sit beside the traffic lights while the add button stays at the end of the tabs ([`7d7c071`](https://github.com/gregce/tortie/commit/7d7c071))

### Fixed

- Once quit starts, no request can reach files, git or your machines mid teardown, so quitting can no longer race a write ([`f711dac`](https://github.com/gregce/tortie/commit/f711dac))
- A clone to a remote machine that cannot record itself durably now refuses to start instead of starting untracked, and a clone cut off partway through the copy is reported once at the next launch ([`1508c6c`](https://github.com/gregce/tortie/commit/1508c6c))

## 0.70.0 (2026-08-24)

This release adds Catch Me Up, a page that shows the conversation you have been having with every session in a project, taken word for word from each agent's own log. One keyboard chord opens it, and most of the rest of the release makes that page better. A small model can also keep the project view's one line per session current, and that stays off until you pick an agent for it.

### Added

- You can now read the conversation you have been having with every session in a project, with your asks and each agent's closing answer word for word from its own log, and a mark beside a claim about files says whether git agrees. It opens on the session you are in, on the sessions in a split side by side, or on the whole project at one line each, and Return jumps to that turn in the live session, though a Gemini session shows your asks only because Gemini records no agent answer ([`cecd6fe`](https://github.com/gregce/tortie/commit/cecd6fe))
- The one session view now carries a rail of your asks down the right side, showing your first words and the time, and pressing a row or walking the rail with the arrow keys lands the conversation on that exchange. The arrow keys now scroll the conversation as the selection moves, each session in the side by side view scrolls on its own, an agent session shows its agent's mark, and a session's actions menu can open the page for that session alone, though the rail leaves the screen on a narrow window ([`ca90b63`](https://github.com/gregce/tortie/commit/ca90b63))
- You can now pick an agent and a model under Settings, then Catch Me Up, and a small model writes the project view's one line for a session after that session finishes a turn, in place of the line Tortie builds from your ask and from git. It ships off and stays off until you pick an agent, and a sentence that names a file, carries a number or says what state the session is in is refused whole, so that row keeps the line Tortie built ([`56c9c59`](https://github.com/gregce/tortie/commit/56c9c59))
- Claude Code, Codex CLI, Cursor CLI, Pi and Grok can each write that line now, and every other agent stays in the picker as a row you cannot choose, on a line saying Tortie has not measured it yet. A row whose line a model wrote says written and the time at the end of the row, though nothing on screen tells you when writing a line failed ([`d4c4d29`](https://github.com/gregce/tortie/commit/d4c4d29))

### Changed

- The wording Tortie uses about remote machines moved out of one large file into files named for the surface each one describes, so changing what one surface says no longer reaches the rest. Nothing a person reads on screen changed ([`2905051`](https://github.com/gregce/tortie/commit/2905051))
- Every internal script that starts the app now closes it again even when the script fails partway, so abandoned copies no longer pile up and exhaust the machine. Nothing a person sees in the app changed ([`4d246f1`](https://github.com/gregce/tortie/commit/4d246f1))

### Fixed

- The agent's closing answer on Catch Me Up now renders as real markdown instead of plain text, and raw HTML inside an answer never becomes part of the page, while your own asks and the project view's one line summaries stay plain. The chord that opens the page is Shift+Command+U, and a per-agent hotkey you recorded on that chord before this release still wins ([`2aa7b6b`](https://github.com/gregce/tortie/commit/2aa7b6b))
- The skill preview sheet is wider and uses more of the window, so more of a long command and its details are readable at once ([`75991fd`](https://github.com/gregce/tortie/commit/75991fd))

## 0.68.7 (2026-08-23)

This release adds a guarded workflow for editing and committing projects on remote machines, from file changes through staging and commit. It also improves navigation and setup screens, and strengthens internal architecture checks. Remote write operations have only been verified on macOS.

### Added

- You can edit, save and create remote files within a confirmed folder. Saves reject stale content, have no undo, discard hard links and extended attributes, and may be uncertain after a disconnect ([`1bff045`](https://github.com/gregce/tortie/commit/1bff045))
- You can create folders and rename files or folders inside the confirmed write root; open tabs follow remote renames. A concurrent process can still create the destination between the availability check and rename, allowing the rename to replace it ([`d0fedbc`](https://github.com/gregce/tortie/commit/d0fedbc))
- You can stage and unstage individual or grouped remote changes from the Changes panel, which refreshes after every action ([`2e87e16`](https://github.com/gregce/tortie/commit/2e87e16))
- You can commit staged remote changes from the Changes panel; remote hooks and signing run there. Tortie prevents stale or duplicate commits, but cannot enter signing passphrases, and timed-out commits may still finish ([`e03af86`](https://github.com/gregce/tortie/commit/e03af86))
- Settings now separates agents by machine, session lists support arrow-key navigation, project tabs can collapse or move to a left rail, and Shift+Command+Return focuses the active file or session ([`33b0925`](https://github.com/gregce/tortie/commit/33b0925))

### Changed

- Split large renderer and file-tree controllers into smaller modules, and removed test harness code from normal launches. Build checks now enforce bundle and import boundaries ([`a60dc8e`](https://github.com/gregce/tortie/commit/a60dc8e))
- Split machine IPC contracts by domain and extracted session services without changing public contracts. Local and remote GitHub Actions now share one parser ([`82c4eff`](https://github.com/gregce/tortie/commit/82c4eff))

### Fixed

- Showing an unavailable agent's install command no longer shifts the onboarding layout, including with long commands or short windows ([`bfb4e29`](https://github.com/gregce/tortie/commit/bfb4e29))
- Removed production runtime import cycles and added a graph check to stop them returning ([`8ce91a0`](https://github.com/gregce/tortie/commit/8ce91a0))
- Machine settings now show readiness first and keep consent details visible. Low-level settings and the agreement fingerprint moved under 'More about this machine' ([`625bdb9`](https://github.com/gregce/tortie/commit/625bdb9))
- Fixed stylesheet order in the skill install panel so its layout rules apply, the agent list stays whole and the facts and plan section gets more space ([`d828913`](https://github.com/gregce/tortie/commit/d828913))
- Moved project rail controls to the start and kept New project available in every rail state. Sidebar controls now use its header, recovering 48px when projects are on the left ([`272a114`](https://github.com/gregce/tortie/commit/272a114))
- Added complete copyright and icon attribution to About and NOTICE, and standardised the company name as Ita Vero, LLC ([`b04ffae`](https://github.com/gregce/tortie/commit/b04ffae))
- New and restored agents now inherit the app's current macOS login session instead of the long-lived server's stale session. Existing sessions keep their original value and need a restart, which does not resume the conversation ([`a43a589`](https://github.com/gregce/tortie/commit/a43a589))
- Restructured skill search, preview and confirmation sheets so actions stay visible while long content scrolls separately. The wider sheets show more of long commands ([`f3c140f`](https://github.com/gregce/tortie/commit/f3c140f))
- Made unavailable-agent install commands wrap and copyable, and improved Add machine spacing. Connection and key setup guidance is shorter without losing consent details ([`d2be957`](https://github.com/gregce/tortie/commit/d2be957))
- Made installed preload bridge members required at compile time and removed compensating casts, while keeping runtime guards and genuinely uninstalled APIs optional ([`9b99ab4`](https://github.com/gregce/tortie/commit/9b99ab4))
- Corrected Material Icon Theme attribution to Material Extensions in source comments, generator output and design docs; no icon assets or matching rules changed ([`354c03c`](https://github.com/gregce/tortie/commit/354c03c))

## 0.62.1 (2026-08-21)

This release makes remote work safer and more accurate. Tortie now preserves unconfirmed sessions and interrupted copies, reads agent availability from the target machine, and fixes Quick Open paths, workflow runs and TypeScript process boundaries.

### Added

- Settings then Agents now shows each machine's detected agents, reported paths and scan age, with a per-machine Rescan action that preserves existing results on failure ([`3d60a08`](https://github.com/gregce/tortie/commit/3d60a08))

### Fixed

- The create sheet now checks agent availability on the target machine in one batched scan and disables only agents confirmed absent. Discovery also ignores executable directories and treats failed machine-facts reads as unknown ([`d646830`](https://github.com/gregce/tortie/commit/d646830))
- Quick Open now handles project and recent-file paths containing spaces by passing the project root and relative path as separate fields ([`3d883ab`](https://github.com/gregce/tortie/commit/3d883ab))
- SpecStory-captured sessions can now be restored or restarted without history capture, and the choice persists for future restores ([`3f08719`](https://github.com/gregce/tortie/commit/3f08719))
- Runs now includes workflows triggered by a tag at the current branch tip, including queued and in-progress runs ([`89226a0`](https://github.com/gregce/tortie/commit/89226a0))
- TypeScript now compiles tests in a separate project, allowing production checks to reject renderer-to-main imports and Node or Electron APIs in shared and renderer code ([`43b12fd`](https://github.com/gregce/tortie/commit/43b12fd))
- Tortie now keeps and marks a remote session unreachable when startup confirmation cannot reach the machine. It reconciles the record when the connection returns instead of launching a duplicate ([`682c870`](https://github.com/gregce/tortie/commit/682c870))
- Quitting Tortie now closes tracked remote SSH work and records interrupted project copies for the next launch, though remote processes may continue. Machine removal is now transactional, so a failure leaves session records and machine configuration unchanged ([`2ad8fcb`](https://github.com/gregce/tortie/commit/2ad8fcb))

## 0.58.3 (2026-08-20)

This release makes another Mac a Tortie workspace. You can run and restore sessions there, then browse, search and review its projects without leaving the app.

Remote project tabs remain read only, and remote SpecStory capture is not supported.

### Added

- Add, test and confirm remote machines in Settings without changing your SSH known-hosts file ([`d8b5e1f`](https://github.com/gregce/tortie/commit/d8b5e1f))
- Prepare a remote machine by starting its tmux server with Tortie's required settings and checking its version ([`4c86bea`](https://github.com/gregce/tortie/commit/4c86bea))
- Create, open, rename and end sessions on another Mac, with clear machine badges and connection states ([`17f1dea`](https://github.com/gregce/tortie/commit/17f1dea))
- Choose System, JetBrains Mono or Source Code Pro for terminals, editors, diffs, Markdown code and exported screenshots ([`7b429d5`](https://github.com/gregce/tortie/commit/7b429d5))
- Restore stopped remote sessions only when the machine is reachable, with timestamped saved output and duplicate-work protection. Remote conversations are not restored ([`1741a01`](https://github.com/gregce/tortie/commit/1741a01))
- Focus the current session with Shift+Command+Return while preserving its split layout and running state ([`8713547`](https://github.com/gregce/tortie/commit/8713547))
- Install a dedicated passwordless SSH key for a machine through a confirmed setup flow. Tortie does not store the password or change your existing SSH keys ([`dbbed64`](https://github.com/gregce/tortie/commit/dbbed64))
- Upload images to remote sessions, review remote changes in diffs and show when saved agent output was last copied. Remote image uploads are limited to 90 KB ([`ecd1b67`](https://github.com/gregce/tortie/commit/ecd1b67))
- Allow an exact unmeasured remote tmux version after confirmation, and stop connection attempts after 10 seconds ([`069ef77`](https://github.com/gregce/tortie/commit/069ef77))
- Choose remote working folders, launch agents by absolute path and preserve remote session output and removal state ([`5e8aa02`](https://github.com/gregce/tortie/commit/5e8aa02))
- Find a matching remote project by its Git address, or offer to clone it after confirmation ([`e61e836`](https://github.com/gregce/tortie/commit/e61e836))
- Prefill supported remote conversation resume commands without pressing Enter for you ([`3cf14ad`](https://github.com/gregce/tortie/commit/3cf14ad))
- Open a remote folder as a read-only project tab with its Explorer, changed files and file diffs ([`9d247ab`](https://github.com/gregce/tortie/commit/9d247ab))
- Open remote folders from the home screen and keep their machine identity in recent projects ([`8596b77`](https://github.com/gregce/tortie/commit/8596b77))
- Show untracked remote files in their own Changes group and include them in the Source Control count ([`2ca5310`](https://github.com/gregce/tortie/commit/2ca5310))
- Search remote project files on the remote machine without copying them locally ([`1f98e2b`](https://github.com/gregce/tortie/commit/1f98e2b))
- Find and open remote files through Quick Open, with recent files tracked per machine ([`2e3eb86`](https://github.com/gregce/tortie/commit/2e3eb86))
- Read a one-time snapshot of the remote screen or its last 1,000, 10,000 or 25,000 lines, with clear truncation notices ([`ce56d1f`](https://github.com/gregce/tortie/commit/ce56d1f))
- Show up to 10 GitHub Actions runs for the remote branch, using your local GitHub sign-in ([`16d4d2c`](https://github.com/gregce/tortie/commit/16d4d2c))
- Show the remote branch, commit, upstream and ahead or behind counts without changing or fetching the repository ([`02aed16`](https://github.com/gregce/tortie/commit/02aed16))
- Browse remote commit history in pages of 50, including lanes, authors, subjects, branches and tags ([`99c19b8`](https://github.com/gregce/tortie/commit/99c19b8))

### Changed

- Remote machines now push session changes instead of relying on polling, while unmeasured tmux versions retain the polling fallback ([`e9351e8`](https://github.com/gregce/tortie/commit/e9351e8))
- Simplified machine setup, added clearer recovery guidance and improved Tailscale device discovery ([`3e1ba07`](https://github.com/gregce/tortie/commit/3e1ba07))
- Load saved sessions and project tabs before the login shell finishes, while keeping Restore disabled until the shell is ready ([`2f0e841`](https://github.com/gregce/tortie/commit/2f0e841))
- Shortened session and machine setup copy, restored compact spacing and moved Diagnostics to the end of Settings ([`efafb86`](https://github.com/gregce/tortie/commit/efafb86))

### Fixed

- Refuse new state-changing requests during shutdown and finish accepted work before saving the final snapshot ([`60bf5ac`](https://github.com/gregce/tortie/commit/60bf5ac))
- Warn when a remote Quick Open result list was cut off at its size limit ([`caa07d3`](https://github.com/gregce/tortie/commit/caa07d3))
- Isolate test servers and folders so concurrent harness runs cannot affect each other or their cleanup ([`abc32fa`](https://github.com/gregce/tortie/commit/abc32fa))
- Sign bundled SpecStory with its required entitlement and update it to 2.10.0 for current Codex and Muse Code capture ([`f97d69b`](https://github.com/gregce/tortie/commit/f97d69b))
- Separate run age from duration, add hover details and remove repeated job names from single-job runs ([`d1ce49f`](https://github.com/gregce/tortie/commit/d1ce49f))
- Mark remote sessions as unreachable during connection loss instead of offering Restore and risking duplicate agents ([`95aa770`](https://github.com/gregce/tortie/commit/95aa770))
- Remove the duplicate full-screen menu item, show home-screen update status and focus the last file opened from Finder ([`a3dcb53`](https://github.com/gregce/tortie/commit/a3dcb53))
- Restore the weekly package check without allowing it to publish a release ([`ab94847`](https://github.com/gregce/tortie/commit/ab94847))
- Start shell sessions as login shells, preserve restore arguments and clarify New Project and SpecStory setup messages ([`2867223`](https://github.com/gregce/tortie/commit/2867223))
- Save session state before sleep and prevent a second shutdown from starting before the first finishes ([`d47ecd7`](https://github.com/gregce/tortie/commit/d47ecd7))
- Remove extra characters from connection-test paths and label the fallback Runs button as Copy ([`9fbe8ed`](https://github.com/gregce/tortie/commit/9fbe8ed))
- Make split dragging reliable, add shortcuts search and improve keyboard control and option summaries in session creation ([`f6cd1ad`](https://github.com/gregce/tortie/commit/f6cd1ad))
- Keep Explorer, Git decorations, Search and Context tied to the machine that owns the active tab ([`f6e4e32`](https://github.com/gregce/tortie/commit/f6e4e32))
- Enable Restore even when projects or sessions fail to load at launch ([`e5d2034`](https://github.com/gregce/tortie/commit/e5d2034))
- Keep the Capture control visible but disabled for remote agent sessions, with an explanation ([`13dbec1`](https://github.com/gregce/tortie/commit/13dbec1))
- Make remote activity indicators follow actual session output instead of stale connection state ([`5e4e217`](https://github.com/gregce/tortie/commit/5e4e217))
- Retry fault-test races so all 16 session recovery cases run every night ([`32d901d`](https://github.com/gregce/tortie/commit/32d901d))
- Start sessions from remote tabs on the tab's machine and folder, including agent hotkeys ([`eb61ffd`](https://github.com/gregce/tortie/commit/eb61ffd))
- Reopen a closed project from the attention list, show each session's folder and add confirmed keyboard session ending ([`9f89497`](https://github.com/gregce/tortie/commit/9f89497))
- Enforce read-only remote files, disable unsafe remote session actions and reduce abandoned image uploads ([`1e3b062`](https://github.com/gregce/tortie/commit/1e3b062))
- Stop scroll polling when a session has no local pane and show that remote scrollback is unavailable ([`1fc2c5f`](https://github.com/gregce/tortie/commit/1fc2c5f))
- Fix the quit-snapshot test race and log counts for every snapshot outcome ([`6487c4f`](https://github.com/gregce/tortie/commit/6487c4f))
- Give every smoke-test run its own tmux socket and profile, including safe cleanup of abandoned servers ([`859a4a0`](https://github.com/gregce/tortie/commit/859a4a0))

## 0.31.0 (2026-08-16)

This release improves how Tortie integrates with macOS and installed agents. Finder and the new `tortie` command can open projects, Settings shows exactly which agent binaries Tortie uses, and new appearance controls let you adjust highlights and contrast. Updating does not affect running sessions.

### Added

- Settings now shows every detected copy of each agent, its version and why Tortie chose one over the others. Missing agents show an official, copyable install command, and sessions always launch the recorded binary ([`bf6e9e2`](https://github.com/gregce/tortie/commit/bf6e9e2))
- Run `tortie .` to open the current folder as a project, starting Tortie if needed. Settings can install or remove this command, which accepts a folder but no agent-launching flags ([`051558e`](https://github.com/gregce/tortie/commit/051558e))
- Grok is now a supported agent with conversation resume by session ID. Tortie suppresses Grok's blocking first-run banner without changing your data-sharing choice, and the documentation now covers all 13 agent trademarks ([`b8c59f4`](https://github.com/gregce/tortie/commit/b8c59f4))
- Finder can open folders, supported text and source files, HTML, Markdown and images in Tortie without making it the default app. Files open inside their nearest Git repository or parent folder ([`6982ae4`](https://github.com/gregce/tortie/commit/6982ae4))
- Settings now offers 4 highlight schemes and 3 contrast levels. The default blue and normal-contrast combination preserves the previous appearance ([`c8508ec`](https://github.com/gregce/tortie/commit/c8508ec))

## 0.26.1 (2026-08-16)

This release bundles tmux, replaces update dialogs with a quiet status control and improves several session interactions. The bundled tmux takes effect only when a new server starts, so updating does not interrupt running sessions.

### Added

- Tortie now includes a signed tmux 3.7b, so new installations need no separate tmux setup. It adopts the bundled version only for new servers and refuses untested client-server version combinations ([`2c225e4`](https://github.com/gregce/tortie/commit/2c225e4))
- A status ring above Settings now shows update progress and offers actions such as restart now, install on quit and repair. Background checks remain quiet, although the ring is unavailable on the home screen until an update is staged ([`9eb2b7f`](https://github.com/gregce/tortie/commit/9eb2b7f))

### Fixed

- Collapsed session lists now support group drag and drop, restoring a session asks before opening its project, and the View menu shows all 4 views and shortcuts ([`cc60680`](https://github.com/gregce/tortie/commit/cc60680))
- Agent startup failures now identify missing interpreters or show the agent's final output instead of leaving a dead pane. Tortie also waits up to 10 seconds for slow login shells ([`2b4ee2f`](https://github.com/gregce/tortie/commit/2b4ee2f))
- Test and harness launches no longer access the macOS keychain or leave keychain prompts behind ([`0d92728`](https://github.com/gregce/tortie/commit/0d92728))

## 0.24.3 (2026-08-15)

This release stops ignored files from flashing during repository updates.

### Fixed

- The Explorer now keeps the last known ignored-file state while refreshing it, so ignored rows no longer flash white during writes. Changes to `.gitignore` can take up to 10 seconds to appear ([`3bbc3e6`](https://github.com/gregce/tortie/commit/3bbc3e6))

## 0.24.2 (2026-08-15)

This release makes updates recoverable and improves everyday repository work. You can inspect CI runs, open files in other apps and use a clearer Explorer without losing terminal selections or session ownership.

### Added

- Source Control now shows the latest 10 GitHub Actions runs for the current branch, including jobs and steps, and watches the run triggered by a push ([`1eeddea`](https://github.com/gregce/tortie/commit/1eeddea))
- File rows now include an Open With menu containing compatible macOS apps and the system chooser ([`9a69e89`](https://github.com/gregce/tortie/commit/9a69e89))
- Settings now provides debug logging and diagnostic tools. Logs rotate at 2 MiB, redact the home-directory path and never upload crash data ([`774132a`](https://github.com/gregce/tortie/commit/774132a))
- Agent definitions can pass named environment variables from your login shell without storing their values on disk ([`67ce3e3`](https://github.com/gregce/tortie/commit/67ce3e3))

### Fixed

- The Explorer now greys ignored files, keeps filters active after opening a result and offers row-spacing controls. History also gains a compact gutter option ([`53e919d`](https://github.com/gregce/tortie/commit/53e919d))
- Right-clicking terminal text now preserves the selection, making Copy as HTML usable. Split groups also make the focused pane clearer without dimming attention indicators ([`08b4757`](https://github.com/gregce/tortie/commit/08b4757))
- Failed updates now explain the cause, and Repair Updates can reset a broken updater in one step ([`cb07b37`](https://github.com/gregce/tortie/commit/cb07b37))
- Sessions in the same folder no longer claim each other's conversation records. Tortie now normalises equivalent paths, allows stronger ownership evidence to replace weaker claims and reports uncertain resumes honestly ([`a5c63aa`](https://github.com/gregce/tortie/commit/a5c63aa))

## 0.20.2 (2026-08-15)

This release stops crashes during quit and makes removed sessions recoverable for 90 days. It also improves update feedback and preserves split layouts across restarts.

### Added

- Past Sessions provides a searchable list of removed sessions for 90 days and shows whether each can resume its conversation ([`d08ab00`](https://github.com/gregce/tortie/commit/d08ab00))
- Manual update checks now show when an update is ready and confirm that it will install when you quit ([`aa4e456`](https://github.com/gregce/tortie/commit/aa4e456))
- Packaged builds now log updater activity and report why an installation was refused on the next launch ([`a63ec76`](https://github.com/gregce/tortie/commit/a63ec76))

### Changed

- New File and New Folder now ask for a valid name before writing anything to disk ([`7c0ae02`](https://github.com/gregce/tortie/commit/7c0ae02))
- Removing a skill now uses the skills CLI and shows every path that will be deleted before confirmation ([`f33599b`](https://github.com/gregce/tortie/commit/f33599b))

### Fixed

- Tortie now waits for file watchers to stop before quitting, preventing the crash reports previously created on every exit ([`3c09245`](https://github.com/gregce/tortie/commit/3c09245), [`3d1d70c`](https://github.com/gregce/tortie/commit/3d1d70c))
- Split groups now preserve their layout and focused pane when projects reopen or Tortie restarts ([`2cbd873`](https://github.com/gregce/tortie/commit/2cbd873))
- Antigravity sessions now prove conversation ownership from the process holding the conversation open and can reclaim incorrect assignments ([`ecdfcad`](https://github.com/gregce/tortie/commit/ecdfcad))

## 0.19.1 (2026-08-14)

This maintenance release corrects the application credit in Tortie's first self-delivered update.

### Fixed

- The About panel now credits gregce and links to the correct repository instead of naming SpecStory ([`dbbaea1`](https://github.com/gregce/tortie/commit/dbbaea1))

## 0.19.0 (2026-08-14)

This release adds quiet, automatic updates that install when you quit without interrupting sessions. Version 0.18.0 cannot update itself, so you must install 0.19.0 manually once.

### Added

- Tortie now checks GitHub Releases for updates, installs them on quit and verifies bundled files after updating. The About menu also adds Check for Updates, and maintainers can remove a bad release from the feed ([`b96b519`](https://github.com/gregce/tortie/commit/b96b519))

### Fixed

- Terminal panes now restore hardware-accelerated rendering after wake, and helper process exits include their cause and decoded exit code in the log ([`e9a8731`](https://github.com/gregce/tortie/commit/e9a8731))

## 0.18.0 (2026-08-14)

This is the first installable Tortie release: a signed and notarized macOS workspace for persistent coding-agent sessions. Projects open as tabs, sessions survive app quits and restarts, and ended conversations can resume with their scrollback.

Existing users must approve macOS permissions again because the app identity changed to `com.itavero.tortie`; data and sessions remain intact. This version does not update itself, and its session-data migration prevents older builds from reopening the data.

### Added

- Tortie now ships as a signed and notarized application under the Itavero identity, backed by a 4-lane CI and release pipeline ([`47eb4f9`](https://github.com/gregce/tortie/commit/47eb4f9))
- Ended sessions can now replay their scrollback and prepare the agent's resume command for confirmation ([`68620b8`](https://github.com/gregce/tortie/commit/68620b8))
- The Context view lists each agent's skills, MCP servers, hooks, plugins and instruction files, and can install skills from GitHub ([`ec219a3`](https://github.com/gregce/tortie/commit/ec219a3))
- Custom agents can now be defined in JSON. Configuration cannot run code directly, and process-launching changes require confirmation ([`89a5a9a`](https://github.com/gregce/tortie/commit/89a5a9a))
- The new home screen lists recent projects and can clone repositories with progress for each phase ([`7b42536`](https://github.com/gregce/tortie/commit/7b42536))
- Markdown files can now show a side-by-side HTML preview, with untrusted content isolated in a restricted frame ([`ffd623b`](https://github.com/gregce/tortie/commit/ffd623b))
- Tortie now keeps verified backups of the session list and can rebuild the list from them ([`8bb473e`](https://github.com/gregce/tortie/commit/8bb473e))
- Session data now uses durable writes, enforced by a fault test that terminates Tortie at 16 critical points ([`3be5d0e`](https://github.com/gregce/tortie/commit/3be5d0e))
- The Search pane now supports zoom through the shared view layout model ([`d6d0fc8`](https://github.com/gregce/tortie/commit/d6d0fc8))
- Each session now shows its SpecStory capture, sync and cloud status ([`e930530`](https://github.com/gregce/tortie/commit/e930530))

### Changed

- The window now uses one layout model, preventing open files from compressing the session tab strip ([`bfa67d7`](https://github.com/gregce/tortie/commit/bfa67d7))
- The app is now named Tortie, and its data migrates by copying and verifying while leaving the original intact ([`09cb853`](https://github.com/gregce/tortie/commit/09cb853), [`53fa1e4`](https://github.com/gregce/tortie/commit/53fa1e4))

### Fixed

- Restore now uses the agent details recorded with the session, so later registry changes cannot lose its conversation ([`a00f798`](https://github.com/gregce/tortie/commit/a00f798))
- Tortie now detects the renamed DeepSeek CLI as CodeWhale while retaining support for the old binary name ([`041b664`](https://github.com/gregce/tortie/commit/041b664))
- The Context view now opens global skills without Git errors, searches the skill registry, supports enabling skills for more agents and presents installation details more clearly ([`5bdf81b`](https://github.com/gregce/tortie/commit/5bdf81b), [`d8e2ebf`](https://github.com/gregce/tortie/commit/d8e2ebf))
- Session reconciliation no longer marks newly created live sessions as restorable, and shared SQLite settings now handle concurrent writers explicitly ([`cda2b1a`](https://github.com/gregce/tortie/commit/cda2b1a), [`bfc3c85`](https://github.com/gregce/tortie/commit/bfc3c85))

## 0.0.1

Unpublished work before the first tagged release. See `docs/BACKLOG.md` and the Git history.
