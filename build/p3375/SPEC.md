# Phase 337.5 — "Yes, all as recommended" … "In the Terminal itself": select text on the phone's Terminal the iPhone way — SPEC

Written by the spec step on 2026-10-16 in `/private/tmp/wt-p3375`, a detached worktree at origin/main `0b87d0af`
("docs(backlog): 345 landed, his research 142 answers, 337.5 queued, three phases started"), with Phase 345 (`80daa9fd`)
under it. The phone at this base is build 11 (`CURRENT_PROJECT_VERSION = 11`), the parent every comparison below names.
Every `file:line` here was read at `0b87d0af` on this date.

**The spec step MEASURED before it wrote, and research 142 §7's first unsettled item is folded in here** (his answer of
2026-10-16, "Fold it into the spec"). §14 holds every command, exit code and number. In short: a SCRATCH app, never the tree,
built under `.../scratchpad/p3375/spec/` (an Xcode project copied from `ios/Tortie.xcodeproj` with its targets renamed
`Probe`, bundle id `local.p3375.probe`, ad hoc, no entitlement), drew a 120-column grid of custom rows in a `UIScrollView`
exactly as `Screens/ScreenScroller.swift` does (one `UIHostingController` that takes no touch, an OPAQUE ground under the
rows, the scroll view's own pinch, double tap and single tap, rows by absolute index, a page reserved above with the offset
moved by its delta), and put the system's selection over it two ways: **(A) `UITextInteraction(for: .nonEditable)`** and
**(B) `UITextSelectionDisplayInteraction` + `UITextLoupeSession` + `UIEditMenuInteraction`** with the scroll view's own long
press and a handle drag, both over a `UITextInput` adopted by the content view. A UI test of its own drove both on an iPhone
16 Pro on **iOS 26.3 and 18.3**, each device made and deleted by `build/simulator-run.mjs` alone under a lock slot, and read
the edit menu by XCUITest's `app.menuItems`, the selection and the system's own handle views from inside the app, and the
pasteboard through the helper's `pasteboard()` of its own device. No screenshot, no Electron, no door, no Mac, no model turn.

Read with it, whole: `docs/research/142-text-that-wraps-to-the-phone.md` (§1, §2.1, §2.7, §4.2, §7, §8),
`docs/BACKLOG.md` "## Phase 337.5" and the running-log lines of 2026-10-16, and for the Terminal it changes
`build/p337/SPEC.md` (D34, today's selection) and `build/p3371/SPEC.md` (D31, the absolute index; §Attack B11, Copy only over
drawn rows) and `build/p3373/SPEC.md` (D17, Copy sideways; D21, the ⋯).

**His words, 2026-10-16**, answering research 142's eight questions: "Yes, all as recommended"; to question 4 (select in the
grid or on a Read page), "In the Terminal itself"; to the research-first step, "Fold it into the spec". So: no wrapping
anywhere (question 1), native selection queued (question 3), in the grid, one surface, as in Safari (question 4), the Terminal
keeps opening fitted (question 5), Catch Me Up stays under ⋯ (question 6).

**The order of authority.** His words override the main session's task text and this entry wherever they differ. The tree at
`0b87d0af` overrides any spec's picture of it. Where this file departs from 337, 337.1 or 337.3, §3 says so row by row.

---

## 0. The hard rules, stated once

- **Never commit, stage or stash**; only the committer does, at landing. `/Users/gdc/gmux` is read only: every shell command
  begins `cd /private/tmp/wt-p3375 &&` (or the role's scratch,
  `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3375/<role>/`), and every heredoc
  delimiter is quoted (`<<'EOF'`). `git diff 0b87d0af` in this worktree is exactly 337.5's delta.
- **No `src/` file moves**, no door route, no contract line, no Mac change: `git diff 0b87d0af -- src/
  docs/audits/contract-baseline.txt` is empty at the end. This is one of the two conditions that hold the phase at Tier 2.
- **The build number does not move.** `CURRENT_PROJECT_VERSION` stays 11 in both configurations and `PHONE_BUILD` in
  `build/conformance-ios.mjs` does not move. The main session sets it at the next archive.
- **Two phases run beside this one and may land first**: 346 (start a session from the phone: `src/main/pocket/**`, a
  new-session screen, `TortieApp.swift`, `Copy.swift`, `DoorClient.swift`, a `start` group in `probe:p316`) and 333.4.1
  (`Screen.swift`'s presentation after a turn, `Sample/SampleBar.swift`, `ScreenKeyField.swift`'s return key, and in
  `ScreenScroller.swift` ONLY `isDirectionalLockEnabled` and the @2x width fill). This phase's edits to `Screen.swift` and
  `ScreenScroller.swift` are only what selection needs, at the lines §5 names, so the landing merges. This phase does NOT edit
  `build/p316/probe-p316.mjs`, `ios/TortieUITests/P316DriveUITests.swift`, `Style/Copy.swift`, `TortieApp.swift` or
  `DoorClient.swift` (§11 says what 337.2 inherits).
- **Never `-L gmux`** and never the default tmux server. Never `pkill`, `killall`, a `pgrep` pattern or a negative pid: a
  process is ended by the pid its starter holds, in a `finally`. No real Tailscale, DNS or APNs. **No model turn**; Gemini,
  Qwen, Antigravity and Grok are never started.
- His keychain, credentials, `~/Keys`, `~/.ssh`, `~/.claude`, `~/.codex`, any conversation store and his live Tortie profile
  are never read. Real screens are the committed captures under `build/fixtures/screen/` and the committed sample
  (`ios/Tortie/Sample/sample.json`).
- **His shell history**: before and after every command that starts a shell, the app or a Simulator, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`. A move across one of your commands is the stop: attribute it and report.
  Any shell a test starts runs with a scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset. (The
  spec step saw `~/.zsh_history` move twice while its runs were up, at 14:00:20 and 14:00:56, the second with none of its
  commands running, and once more at 14:07:34; §14 S9 says why it attributes them to his own shell.)
- **Simulators only through `build/simulator-run.mjs`** (`withSimulator`; `P316_DEVICE` and `P316_RUNTIME` for `test:ios`;
  the handle's `pasteboard()` for the clipboard), never Simulator.app, never a screenshot: a visual claim is a frame or a label
  XCUITest read. **Every Electron** through `build/electron-run.mjs` inside `build/harness-socket.mjs`, killed in a `finally`
  (this phase starts none). Every process a script starts, it ends in a `finally`.
- **Xcode derived data** only under `.../scratchpad/p3375/<role>/dd*`, deleted before the role returns.
- **THE LOCK HAS THREE SLOTS**: `zsh /private/tmp/tortie-ops/lock.sh try p3375` (prints the slot or exits 1; retry every
  60 s in a NEW command), released with `zsh /private/tmp/tortie-ops/lock.sh release <slot>` ON THE SAME COMMAND LINE as the
  run. Every `test:ios`, probe or Simulator run holds one. Builders and the integrator boot no Simulator except the
  integrator's `test:ios` and the probe's `--grader-self-test` (which boots none).
- **DISK**: `df -h /` before any build; under 8 GB free, wait and report. **INSTALL NOTHING.**
- User-visible words follow CLAUDE.md's UI rules: just enough words, no tmux words, no new word without its owner.

---

## 1. The answer first

**What a person can do after this phase.** On the iPhone, in a session's Terminal:

1. **A long press on a word selects it, the iPhone's way**: the word is highlighted, the iPhone's own two round handles sit at
   its ends, the iPhone's magnifier shows the text under the finger, and when the finger lifts the iPhone's own edit menu
   appears above the selection holding ONE item, **Copy**. A word is everything between two spaces on that row, so a path, a
   URL, a flag or a hash comes in one press. Keeping the finger down and sliding it grows the selection, as today.
2. **Either handle drags the selection** across rows, into what the session printed before (history, by its absolute index),
   with the magnifier while it moves and the menu again when it stops. To reach a row above the view he scrolls (the selection
   and its handles stay on their rows) and drags again.
3. **Copy puts exactly the text today's Copy puts** on the iPhone's clipboard, and clears the selection.
4. **Nothing else he does on the Terminal changes**: a tap raises the keyboard; a tap with a selection clears it (a tap ON the
   selection shows the menu again); a double tap zooms; a pinch zooms; a drag scrolls and pages back; the keyboard stays up if
   it was up; sideways works the same way. The Copy button in the top bar (upright) and over the terminal (sideways) is gone:
   the edit menu is Copy in both orientations.

**Nothing changes on the Mac**, and nothing under `src/` moves. **Menus: no Mac menu moves.** The phone's top bar on the
Terminal loses the Copy button it drew while a selection was held (the ⋯ stays its one trailing item); the iPhone's own edit
menu appears over the selection instead.

### 1.1 The measured answer to research 142 §7's first unsettled item

| Question | Measured answer (§14) |
| --- | --- |
| Which UIKit interaction gives the system's handles, loupe and edit menu over rows custom-drawn in a `UIScrollView`? | **(B)**: `UITextSelectionDisplayInteraction` (handles and highlight, UIKit's own `_UITextSelectionLollipopView`s, read inside the app at the selection's ends within 1.0 pt in every reading on both runtimes: the start handle on the start caret, the end handle's view 1 pt left of the end caret), `UITextLoupeSession` (the loupe, a loupe view seen in the window during every press and drag) and `UIEditMenuInteraction` (the edit menu), over a `UITextInput` the content view adopts, driven by the scroll view's own long press and one handle drag. **(A) `UITextInteraction` is refused** for five measured reasons (D1) |
| Which `UITextInput` methods does it need when a position is an absolute row and column? | All of the protocol's required members must exist (Swift requires them), but (B) READS only `selectedTextRange`, `selectionRects(for:)`, `caretRect(for:)`, `firstRect(for:)` and `textInputView` (the content view); the long press, the handle drag and the menu use the Terminal's own arithmetic (`ScreenSelecting.hit`). A position is a CARET: an absolute row index and a column `0...columns`; a range is two carets; the selection itself stays today's inclusive `ScreenSelectionRange` of cells (D2) |
| How is the edit menu narrowed to Copy? | (B) builds the menu from nothing in its own delegate (`editMenuInteraction(_:menuFor:suggestedActions:)`): one `UIAction` titled `Copy`, never the suggested actions. XCUITest reads exactly `["Copy"]` on 26.3 and on 18.3 in every state a menu was up upright (§14 M3); sideways it is read first by `probe:p3375` N6 (§14 M7). For contrast, the system's DEFAULT menu over the same text, measured through (A), offers `Copy, Translate, Share…` on 26.3, and its suggested list holds Look Up, Find Selection, Speak, Writing Tools, Scan Text and Learn… besides |
| Select All? | **Not offered** (D19): "all" would name rows the phone never fetched, so Copy would wait on them; not cheap |
| Do the double tap to zoom, the pinch, the pan, the single tap that raises the keyboard and scrollback paging still behave beside it? | **(B): yes, every one, with and without a selection**, on both runtimes: the double tap zoomed (3 of 3), the pinch zoomed (4 of 4), swipes scrolled, a tap with no selection raised the keyboard and one with a selection cleared it and raised nothing, and 100 rows reserved above a selection moved the offset by exactly their height with the handles still on the selected cells. **(A): no**: without first responder its single and double taps swallow the Terminal's (0 of 2 taps and 0 of 2 double taps reached them); with first responder its double tap SELECTS A WORD instead of zooming (0 zooms) and every long press puts the keyboard away |

**The tier, decided from the measurement: Tier 2.** Both conditions the entry set hold: the edit menu offers Copy and nothing
else, read by XCUITest on iOS 26.3 and 18.3 upright (sideways is `probe:p3375` N6's first reading, §13 item 5) (no Share, Translate, Look Up, Search Web, Speak or Writing Tools, and no Select
All); and no `src/` file changes (§0). Under his lighter-checking ruling of 2026-10-15: one verifier, then the fix round and an
independent reverify.

### 1.2 The decisions, each with its reason

| # | Decision | Reason |
| --- | --- | --- |
| D1 | **The mechanism is (B)**: the content view of `ScreenScrollView` becomes `ScreenTextContent: UIView, UITextInput` (new file `Screens/ScreenTextInput.swift`); a `UITextSelectionDisplayInteraction` and a `UIEditMenuInteraction` are added to it with `addInteraction`; a `UITextLoupeSession` runs for each press and handle drag; the long press (UIKit's, on the scroll view, `ScreenGesture.longPressSeconds`, as today) and ONE new handle drag (UIKit's `UIPanGestureRecognizer`, on the scroll view) drive it. **No `UITextInteraction` anywhere.** | Measured (§14 M1, M2, M5, M6): (A) selects NOTHING unless its text input becomes first responder (26.3: 0 selections over every press of five such drives), and without it its own single and double tap recognisers on the content view swallow the Terminal's keyboard tap and zoom (0 of 2 each); with first responder (A) puts the keyboard away on every long press made while typing (26.3 and 18.3: the content view first responder, `typing` false, the keyboard gone), its double tap selects a word where his 337 ruling zooms (0 zooms in 2), its handle drag "lifts" so a 20 pt drag of the end handle moved no row at the fitted 6.67 pt cell (1205:60 where (B) reached 1208:60), and its menu is the system's suggestion list, narrowed only through two hooks (`editMenu(for:suggestedActions:)` and `canPerformAction`). (B) changes no first responder, adds no recogniser the Terminal does not own, and its menu is the Terminal's own |
| D2 | **Positions are carets; the selection is cells.** `ScreenCaret(row:column:)` (absolute index, column `0...columns`) is what `UITextPosition` carries (`ScreenTextPosition`), a `UITextRange` is two carets (`ScreenTextRange`); the selection the page holds stays today's inclusive `ScreenSelectionRange` of `ScreenPoint`s (337 D34, 337.1 D31), and `ScreenSelectionRange.carets` converts (end caret = end cell's column + 1, through `DoorNumber.sum`) | Every rule today's selection keeps reads `ScreenSelectionRange` (`ScreenSelecting.text`, `drawn`, `ScrollbackModel.drawn`, `ScrollbackModelTests`, `TerminalFillTests`); UIKit's protocol speaks carets. One conversion, pure and tested, and nothing else changes shape |
| D3 | **The long press** (unchanged recogniser, 0.45 s, on the scroll view, its point read with `location(in: contentView)` and hit by `ScreenSelecting.hit`, absolute index): `.began` selects the WORD under the finger (D4), holds the picture, begins the loupe; `.changed` grows the selection from that word to the cell under the finger (the word stays selected; a finger before it moves the start, after it the end); `.ended` ends the loupe and presents the menu (D8); `.cancelled`/`.failed` ends the loupe. | His "the iPhone way" with today's press kept: measured on both runtimes, a press-and-slide along a row (today's UI tests' own drive shape, `press(forDuration: 1.0, thenDragTo:)`) selected `1206:0-1206:71`, the whole stretch, with the menu up after |
| D4 | **A word is the run of non-blank cells on the pressed row** around the pressed column; a wide character's second, empty column belongs to it; a BLANK cell selects itself alone, so a press always makes a selection, as today's did. Pure: `ScreenSelecting.word(at:cells:)` | Measured: one press on `/usr/local/bin/tool-1205` selected all 24 cells. A terminal's words are paths, URLs, flags and hashes; Unicode word breaks would cut a path at every `/` |
| D5 | **The handles are UIKit's** (the display interaction's), at the selection's ends. A drag that STARTS within 22 points of the start caret or the end caret (`caretRect(for:)`, the content's points) moves that end to the cell under the finger, 1:1 (no lift); crossing the other end swaps which end it moves; `UIScrollView`'s own pan `require(toFail:)` the handle drag, and the handle drag's delegate answers `gestureRecognizerShouldBegin` only near a handle, so a drag that does not start on a handle scrolls as today | Measured: end handle 3 rows down to `1208:60` exact on both runtimes; start handle held at the view's top for 3 s reached the top visible row (`1132:9` on 26.3, `1129:9` on 18.3). 22 points is half Apple's 44-point touch target |
| D6 | **No autoscroll.** A handle reaches the rows in view; to reach rows above, he scrolls (one finger off the handles; the selection, its absolute indices and its handles stay) and drags again | Measured: neither (A) nor (B) scrolls the enclosing view at its edge (offset 876 before and after a 3 s hold at the top, 26.3). (aq6) holds the offset to three writers; an autoscroll would be a fourth. Swipes with a selection held kept it (both runtimes) |
| D7 | **The loupe** is `UITextLoupeSession.begin(at:fromSelectionWidgetView: nil, in: contentView)` at a press's `.began` and a handle drag's `.began`, `move(to:withCaretRect:trackingCaret: true)` on each `.changed`, `invalidate()` at the end | Measured: a loupe view in the window during every press and drag, on both runtimes |
| D8 | **The edit menu** is ONE `UIEditMenuInteraction` on the content view, presented with `UIEditMenuConfiguration(identifier: nil, sourcePoint:)` at the end of a press, at the end of a handle drag and on a tap inside the selection; its delegate's `targetRectFor` is the union of the selection's rects; its `menuFor` returns `UIMenu(children: [copy])` where `copy` is `UIAction(title: Copy.copy, image: UIImage(systemName: "doc.on.doc"), identifier: UIAction.Identifier(ID.screenCopy))` with `accessibilityIdentifier = ID.screenCopy`, ONLY while every selected row is drawn, and `UIMenu(children: [])` otherwise (UIKit then shows no menu). `suggestedActions` is never read and never returned | Measured: exactly `["Copy"]`, hittable, on 26.3 and 18.3 (§14 M3). The Copy word is today's (`Copy.copy`, `/// Mac:`-owned), so `conformance:phonecopy` does not move |
| D9 | **Nothing that sends his words anywhere can reach the Terminal's text**: the content view answers `canBecomeFirstResponder` false (so no responder-chain edit command, Look Up, Share or Translate is ever offered for it), `writingToolsBehavior` `.none`, no `UITextInteraction`, no `UIMenuController`, no `UIDragInteraction` or text drag delegate, no `UIActivityViewController`, `ShareLink`, `UIReferenceLibraryViewController` or Translation presentation in any `Screens/Screen*.swift` file; `insertText`, `deleteBackward`, `replace(_:withText:)` and `setMarkedText` do nothing | The entry's Tier 2 condition, held as text by (al) so a later round cannot add Share beside Copy; measured that the system's default would add Translate and Share… |
| D10 | **A selection over rows not yet fetched waits, and its menu is owed.** While any selected row is reserved (`ScrollbackModel.drawn` false) the menu is empty and the presentation is OWED; when a layout pass finds every selected row drawn, no press or handle drag under way and the menu owed, it presents the menu at the selection (and otherwise `reloadVisibleMenu()`). Copy never copies a blank line where a line of his was (337.1 §Attack B11) | Measured on both runtimes with a reserved row inside the selection: no menu while it was reserved, and Copy up, with no touch, within the 1 s the drive waited after the row was filled (`afterFill`); the pasteboard then held the filled row |
| D11 | **Taps**, as one pure table `ScreenSelecting.tap(selection:at:)`: no selection → `.focus` (the page raises the keyboard, as today); a selection and a tap on a selected cell → `.menu` (present the menu); a selection and a tap anywhere else → `.clear` (the page clears it, raising nothing, as today). The double tap (zoom), the pinch and the pan do not change | Measured: tap outside cleared with no keyboard; tap with none raised it; tap inside re-presented the menu, both runtimes. UIKit dismisses an edit menu on any touch outside it, so a tap inside SHOWS the menu rather than toggling it (measured: a second tap inside re-presented it) |
| D12 | **Every layout pass tells the selection where its rows are now**: `ScreenScrollView.layoutSubviews` hands the content view its geometry (`ScreenTextGeometry`: cell, first index, columns, rows laid out) and, in the pass's redraw, calls `contentView.laidOut()`, which asks `setNeedsSelectionUpdate()`, `updateVisibleMenuPosition(animated: false)` and pays an owed menu (D10) | Measured: the handles sat on the selected cells after a pinch, a double tap and 100 rows reserved above, with the call AND without it (G2: UIKit re-asks the geometry when the content's bounds change); kept because the geometry is the Terminal's own and a pass can move the first index without changing the content's size (an eviction); the unit test plants exactly that |
| D13 | **The held picture, unchanged.** A selection beginning holds the picture (`model.hold()`, `scrollback.selecting = true`, no eviction); Copy or a clear lets it go (`model.letGo()`); back to live with a selected row no longer held clears it (`Screen.swift:412-420`, kept); `Copy.screenHeldWhileSelecting` is the line while it is held (kept) | 337 D34, 337.1 D31; the entry's mechanism 3 |
| D14 | **Copy, unchanged below the menu.** The menu's Copy calls the page's `copySelection()`: guarded by `copyDrawn`, it writes `ScreenSelecting.text(...)` by absolute index through `ScreenSelecting.copy`, the ONE `UIPasteboard.general.string = text` in `Screens/ScreenSelection.swift` (rule al), then clears the selection and lets the picture go. Nothing reads the pasteboard | The entry's mechanism 2 and 3; measured Copy's text on the pasteboard equal to the selected cells by the absolute-index rule, a wide character once (`W1133 中文 wide cells`), both runtimes |
| D15 | **The highlight is UIKit's** (the display interaction's highlight view, tinted by the content view's `tintColor = UIColor(Tokens.accent)`), drawn ABOVE the rows' hosting view. `ScreenWindow`'s own highlight overlay, its `highlights` field and `ID.screenSelection` go | Measured: the highlight view at subview index 1 over the host at 0, an opaque ground under the rows as `ScreenWindow` draws; two highlights would draw twice |
| D16 | **Copy's two buttons go.** The toolbar's Copy (upright, `Screen.swift:359-369`) and the overlay's (sideways, 337.3 D17, `Screen.swift:479-491`) are removed; `TerminalChrome` loses `toolbarCopy` and `overlayCopy`; the edit menu is Copy in both orientations. The ⋯ stays the top bar's one trailing item | Replaced, never doubled (the entry). Sideways is read first by `probe:p3375` N6 (the scratch harness could not address a row sideways, §14 M7); the menu is built by the same delegate in either orientation |
| D17 | **The keyboard and first responder never change for a selection.** The hidden key field stays first responder if it was; the content view never becomes one | Measured with (B): keyboard up, a long press selected a word, the key field stayed first responder and `typing` true, the keyboard stayed (335 pt on 26.3, 336 pt on 18.3's first boot; 18.3's second boot reported no software keyboard height at all, before and after the press alike) and Copy worked; today's long press leaves it up too, so no scenario is worse than today |
| D18 | **No new word, no new identifier.** `Copy.copy` titles the menu's Copy; `ID.screenCopy` (`screen-copy`) becomes the menu action's identifier; `ID.screenSelection` is removed with the overlay it named. `conformance:phonecopy` does not move | CLAUDE.md "just enough words"; the drives that read Copy by `screen-copy` (§14 M8 says what XCUITest exposes) |
| D19 | **No Select All** | "all" would be every row tmux holds (25,000 by default) while the phone holds at most 3,000 and fetches pages on demand: the selection would wait on rows never fetched, so the menu would never offer Copy for it |
| D20 | **The rows stay accessibility elements as today**: `ScreenTextContent.isAccessibilityElement = false`, so `screen-row-<n>` and `screen-history-<i>` are found as before | Measured: the scratch rows were found by identifier through a `UITextInput` content view on both runtimes |
| D21 | **Arithmetic (rule k).** Every operator in the new code has a `CGFloat(…)` or `Double(…)` operand (as `ScreenScroller.swift` writes them), or goes through `DoorNumber.sum`/`difference` or `ScrollbackLayout.plus`/`less`; a whole number back from floating arithmetic only through `Int(exactly:)` of a finite rounded value; a negative offset as `-Double(x)`. **No `ARITHMETIC_NAMED` entry and no new scope.** The door's caps bound every position: 512 columns (`PocketScreen.widest`) and index 100,000 (`PocketScreen.deepest`) | rule (k) holds every app file; a caret offset is `(row − first) × (columns + 1) + column`, at most about 51 million |
| D22 | **Concurrency.** `ScreenTextContent` and its driver are `@MainActor`; the `UIEditMenuInteractionDelegate` conformance is written `@preconcurrency` (measured: under `SWIFT_STRICT_CONCURRENCY = complete` the plain conformance warns "crosses into main actor-isolated code … an error in the Swift 6 language mode") | the app builds with complete checking |
| D23 | **The app run is a probe of its own**, `probe:p3375`, over See a sample (no door, no Mac, no Electron), with its own UI test class, beside the parent; `probe:p316`'s screen group is not run (337.2 owns its repair; §11) | research 142 §5 and the entry allow it; the screen group reads failures at the parent; 346 is editing `probe:p316` beside this phase |
| D24 | **Tier 2**, both conditions measured; lighter checking; one verifier with one independent method, the attack (§7.5), and the parent | §1.1 |

**Subject.** `feat(ios): select text on the Terminal with the iPhone's own handles`

**First body line.** `Phase 337.5: native selection on the Terminal`

**Semver.** Minor, unreleased, phone only. The build number does not move (the main session sets it at the next archive).

---

## 2. The tree at this head, re-read

| What | At `0b87d0af` |
| --- | --- |
| Today's selection | `ios/Tortie/Screens/ScreenSelection.swift`: Paseo's gesture table (`ScreenGesture`, `:44-105`; the 450 ms long press `:47-50`), `ScreenPoint` (`:112-115`), `ScreenSelectionRange` (`:118-135`), `ScreenSelectionModel` (`:138-161`), `ScreenSelecting.hit` (`:168-175`), `rects` (`:179-188`), `text` (`:194-212`), `drawn` (`:217-219`), and the one pasteboard write (`:226-229`) |
| The scroll view | `ios/Tortie/Screens/ScreenScroller.swift`: `ScreenScrollerActions` (`:86-93`), the representable passing `selection` (`:96-120`), `ScreenGestureRules` (`:123-127`), `contentView = UIView()` (`:143`), `selection` didSet (`:149-151`), `addGestures` (`:235-247`: long press with `longPressSeconds`, pinch, double tap, single tap requiring the double), `point(at:)` (`:251-256`), `pressed` (`:258-269`), `tapped` (`:271-273`), `layoutSubviews` (`:401-495`, its redraw at `:490-494`), `windowView`'s `highlights:` (`:667`) |
| The page | `ios/Tortie/Screens/Screen.swift`: `TerminalChrome.toolbarCopy`/`overlayCopy` (`:233-240`), `@State private var selection = ScreenSelectionModel()` (`:283`), the toolbar Copy (`:359-369`), back to live clearing a selection (`:412-420`), the scroller's actions (`:439-448`), the overlay Copy (`:479-491`), the held line (`:525`), `copyDrawn` (`:532-536`), `tapped` (`:538-559`), `selected` (`:561-572`), `copySelection` (`:574-584`) |
| The window of rows | `ios/Tortie/Screens/ScreenGrid.swift`: `ScreenWindow.highlights` (`:126-127`), `.empty` (`:130-133`), the overlay (`:144`), the highlight view identified `ID.screenSelection` (`:182-198`) |
| Identifiers | `ios/Tortie/Screens/Identifiers.swift`: `screen-copy` and `screen-selection` documented (`:240-241`), declared (`:504-505`) |
| The history | `ios/Tortie/Screens/ScreenScrollback.swift`: `selecting` (no eviction, `:879-881`), `row(at:picture:)` and `drawn` (`:1030-1039`) |
| The keyboard's owner | `ios/Tortie/Screens/ScreenKeyField.swift:198-250`: a hidden `UITextView`, paste refused, Writing Tools off; first responder while he types |
| The gates | `build/conformance-ios.mjs`: (k) `ARITHMETIC_NAMED` `:1642-1690`; `OWNER_CHECK_ABSENT` `:5675`; `SCREEN_FILES` `:10235-10246`; (al) `:10626-10663`; (aq) `:10919-11111` (the long press `:10969-10973`, points read in the content view `:10981-10983`, the offset's writers `:11017-11025`); (as8) `:11336-11342`; (ax) `:12474-12584` (`CHROME_MEMBERS` `:12477`, Copy's placement `:12552-12567`); their self-tests `:13091-13097`, `:13239-13241`, `:13410-13440`, `:13518-13536`. `build/p316/ablation-ios.mjs`: `al1`, `al2` `:2884-2897`; `aq1` to `aq10` `:2996-3070` (`aq8` reads `press.location(in: contentView)`); the selection arms `:3168-3180`; the `ax` Copy arm `:4094` |
| The unit tests | `ios/TortieTests/ScreenSelectionTests.swift` (Paseo's tables, the hit, the rects, the text, the pasteboard), `TerminalChromeTests.swift:28-31, 47-49, 61-62, 72-73, 112-114, 138` (the two Copies), `ScreenScrollerTests.swift:122` (the actions' shape) |
| The drives that read Copy | `ios/TortieUITests/P316DriveUITests.swift` `screenSelect` (`:3002-3024`), `keyboardGlitch` (`:3424-3444`), `landscapeSelect` (`:4142-4166`), `screenReading`'s `copy` and `selection` keys (`:2745-2746`); `build/p316/probe-p316.mjs` `gradePs6` (`:5598-5610`), `gradePl3` (`:6576-6595`), PS14's held Copy beside the ⋯ (fixture `:7401`) |

---

## 3. Where his words, the entry and earlier specs are reconciled

| Row | Earlier | Here | Why |
| --- | --- | --- | --- |
| R1 | 337 D34: a custom 450 ms long press, a drag extends it, Copy a button | The same long press, now selecting a WORD with UIKit's handles, loupe and edit menu | his answer 4; the entry's mechanism 2 |
| R2 | 337.3 D17: Copy at the terminal's bottom right sideways, the bar's upright, one `screen-copy` at a time | The edit menu's Copy, both orientations; no button | replaced, never doubled |
| R3 | 337.3 D21: "while a selection is held Copy stays beside it [the ⋯]" | The ⋯ alone | R2 |
| R4 | Paseo's tap table (`ScreenGesture.release`) | `ScreenSelecting.tap`: focus, menu, clear | a tap on a selection shows its menu, the iPhone's way |
| R5 | The entry: "UITextInteraction (or UITextSelectionDisplayInteraction with UITextInput over the grid)" | The second, measured | D1 |
| R6 | The entry: "Copy (and Select All if it is cheap)" | Copy alone | D19 |
| R7 | The entry's proof: "probe:p316's screen group, or a probe of its own" | A probe of its own | D23 |

---

## 4. The base, the order and the merge

- Base `0b87d0af`. 346 and 333.4.1 run beside this phase and may land first. Whichever lands later merges by hand-checked
  resolution in the files two of them touch: `build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs`,
  `ios/Tortie/Screens/Screen.swift`, `ios/Tortie/Screens/ScreenScroller.swift`, `ios/Tortie/Screens/Identifiers.swift`,
  `build/assert-simulator-teardown.mjs` (333.4.1's rule 10 and this phase's floor are different lines), `package.json` and
  `build/verification-checks.mjs` (a new probe each), `CLAUDE.md`, `CHANGELOG.md`.
- **Where this phase's hunks sit**, so a merge is read rather than guessed: in `ScreenScroller.swift`, the content view's type
  (`:143`), the selection didSet (`:149-151`), `ScreenGestureRules` (`:123-127`), `addGestures` (`:235-247`), `pressed` and
  `tapped` (`:258-273`), one geometry line after `cell = now` (`:452`), the redraw (`:490-494`) and `windowView`'s
  `highlights:` (`:667`); NOT `init` (`:190-214`) and NOT the fitted cell (`:411-413`), which are 333.4.1's. In `Screen.swift`,
  `TerminalChrome`'s two Copy members (`:233-240`), the selection state (`:283`), the toolbar Copy item (`:359-369`, leaving
  `trailing`, `.toolbarVisibility` and `.statusBarHidden` as they are: 333.4.1's presentation lives there), the scroller's
  actions (`:439-448`), the overlay Copy (`:479-491`) and the selection functions (`:532-584`).
- A new conformance rule letter is NOT taken (346 may take the next); this phase widens (al), (aq), (as) and (ax).
- After landing: the worktree, `dd*` folders and scratch under `.../scratchpad/p3375/` are removed by the follow-up (CLAUDE.md).

---

## 5. The design

### 5.1 The model — `ios/Tortie/Screens/ScreenSelection.swift` (builder **select**)

Keep, unchanged in shape: `ScreenPoint`, `ScreenSelectionRange` (its `columns(on:of:)` and `normalised`), `ScreenSelecting.hit`,
`rects`, `text`, `drawn`, `lineBreak`, and `copy` with its ONE `UIPasteboard.general.string = text` (rule al). Keep
`ScreenGesture.longPressSeconds` (0.45, the scroll view's long press, rule aq). Remove Paseo's tables (`tapTolerance`,
`longPress`, `verticalScroll`, `Status`, `Intent`, `Action`, `intent`, `release`) and `ScreenSelectionModel`; the header says
why (337.5 replaced them with UIKit's selection) and keeps Paseo's attribution for what stays.

Add, pure and `Sendable`:

- `struct ScreenCaret: Equatable, Hashable, Sendable { let row: Int; let column: Int }` — an absolute row index and a column
  `0...columns`.
- `extension ScreenSelectionRange { var carets: (start: ScreenCaret, end: ScreenCaret)? }` — start caret at the start cell,
  end caret one past the end cell (`DoorNumber.sum(end.column, 1)`); nil when the sum fails.
- `static func ScreenSelectionRange.between(_ a: ScreenCaret, _ b: ScreenCaret, columns: Int) -> ScreenSelectionRange?` — the
  cells between two carets in reading order (end cell = the caret before the later one; a caret at column 0 ends on the row
  above at `columns − 1`), nil when empty.
- `enum ScreenSelectionEnd: Sendable { case start, end }`.
- `static func ScreenSelecting.word(at point: ScreenPoint, cells: [String]) -> ScreenSelectionRange` (D4): a cell is BLANK when
  it is `" "` or past `cells`; `""` (a wide cell's second column) is not blank.
- `func ScreenSelectionRange.extending(to point: ScreenPoint) -> ScreenSelectionRange` (D3: the receiver is the pressed word;
  a point before its start moves the start, after its end moves the end, inside keeps it).
- `func ScreenSelectionRange.moving(_ end: ScreenSelectionEnd, to point: ScreenPoint) -> (ScreenSelectionRange, ScreenSelectionEnd)`
  (D5: crossing swaps which end is held).
- `enum ScreenTap: Equatable, Sendable { case focus, menu, clear }` and
  `static func ScreenSelecting.tap(selection: ScreenSelectionRange?, at point: ScreenPoint?) -> ScreenTap` (D11: inside means
  `selection.columns(on: point.row, of: …)` contains `point.column`; the columns come from the caller).

### 5.2 The UIKit side — NEW `ios/Tortie/Screens/ScreenTextInput.swift` (builder **select**)

The header states D1 (why (B), with the measured reasons), D8, D9, D10 and D17, and that the design is UIKit's own.

- `final class ScreenTextPosition: UITextPosition` holding one `ScreenCaret` (`isEqual`/`hash` by it).
- `final class ScreenTextRange: UITextRange` holding two `ScreenTextPosition`s (`isEmpty` when equal).
- `final class ScreenSelectionRect: UITextSelectionRect` (a rect, `containsStart`, `containsEnd`, left to right, not vertical).
- `struct ScreenTextGeometry: Equatable { let cell: ScreenCell; let first: Int; let columns: Int; let rows: Int }`.
- `@MainActor final class ScreenTextContent: UIView, UITextInput` — the scroll view's content view:
  - `var geometry`, `var selection: ScreenSelectionRange?` (set by the scroll view; never by UIKit: `selectedTextRange`'s
    setter does nothing), and three closures the scroll view sets once: `cells: (Int) -> [String]?` (a row's cells by
    absolute index, `scrollback.row(at:picture:)?.cells`), `drawn: (ScreenSelectionRange) -> Bool`
    (`scrollback.drawn(_:picture:)`), and `events: ScreenTextEvents` (`select: (ScreenSelectionRange?) -> Void`,
    `copy: () -> Void`).
  - `init`: `isAccessibilityElement = false`, `backgroundColor = .clear`, `tintColor = UIColor(Tokens.accent)`, adds the
    `UITextSelectionDisplayInteraction` and the `UIEditMenuInteraction` with `addInteraction`.
  - `override var canBecomeFirstResponder: Bool { false }`; `var writingToolsBehavior: UIWritingToolsBehavior { get { .none } set {} }`
    (measured: a get-only `@objc var` "nearly matches" the optional requirement and is not taken); `insertText`,
    `deleteBackward`, `replace(_:withText:)`, `setMarkedText`, `unmarkText`, `setBaseWritingDirection` do nothing;
    `hasText` true; `markedTextRange` nil; `tokenizer` `UITextInputStringTokenizer(textInput: self)`; `inputDelegate` weak.
  - Geometry, the content's points, through `ScreenSelecting.rects`' own arithmetic (row `index − first`, column × width):
    `selectionRects(for:)` (one per row, `containsStart` on the first, `containsEnd` on the last), `caretRect(for:)` (a
    caret's column × width, its row's band, at least one pixel wide), `firstRect(for:)`, `closestPosition(to:)` (row by
    `y ÷ height` from `first`, column rounded to the nearest caret, clamped to the rows laid out and `0...columns`),
    `closestPosition(to:within:)`, `characterRange(at:)`.
  - Positions: `beginningOfDocument`/`endOfDocument` (`first`, 0) and (last row, `columns`); `compare`; `offset(from:to:)` and
    `position(from:offset:)` by the caret offset `(row − first) × (columns + 1) + column`, in `Double` with
    `Int(exactly:)` (D21); `position(from:in:offset:)`, `position(within:farthestIn:)`,
    `characterRange(byExtending:in:)`, `textRange(from:to:)`, `baseWritingDirection` (left to right), `text(in:)` (the
    range's cells by `ScreenSelecting.text`).
  - The driver's entry points, called by the scroll view: `press(_ state: UIGestureRecognizer.State, at point: CGPoint, hit: ScreenPoint?)`,
    `grabs(at point: CGPoint) -> Bool` (D5's 22 points, remembers which end), `drag(_ state:, at point:, hit:)`,
    `showMenu(at:)`, `selectionChanged()` (the scroll view's `selection` changed: update the display, dismiss the menu when
    nil, clear what is owed) and `laidOut()` (D12).
  - The two delegates, `UITextSelectionDisplayInteractionDelegate` and `@preconcurrency UIEditMenuInteractionDelegate`, in an
    extension or a small `NSObject` the content owns: `menuFor` (D8, D10), `targetRectFor`.
- Nothing in the file names `UIPasteboard`, `UITextInteraction`, `UIMenuController`, a drag interaction, a share or look-up
  controller, `URLSession` or a door type. Copy's press calls `events.copy()`; the page writes the clipboard.

### 5.3 The scroll view — `ios/Tortie/Screens/ScreenScroller.swift` (builder **select**)

- `ScreenScrollerActions`: `tap: (ScreenPoint?) -> Void` (now only `.focus`), `select: (ScreenSelectionRange?) -> Void`
  (replaces `(ScreenPoint, Bool)`), `copy: () -> Void` (new), `overlap` (unchanged).
- `let contentView = ScreenTextContent()`; its closures set once in `addGestures()` (`cells`, `drawn` through `scrollback`
  and `picture`; `events.select` → `actions?.select`, `events.copy` → `actions?.copy`).
- `var selection` didSet: `contentView.selection = selection; contentView.selectionChanged()`, then `changed()`.
- `addGestures()`: the long press as today; NEW `let handle = UIPanGestureRecognizer(target: self, action: #selector(dragged(_:)))`
  with `handle.delegate = rules`, `panGestureRecognizer.require(toFail: handle)`; pinch, double, single as today; every one
  `addGestureRecognizer` on the scroll view itself.
- `ScreenGestureRules` gains a weak `content: ScreenTextContent?` and `gestureRecognizerShouldBegin(_:)`: the handle drag
  begins only when `content?.grabs(at: g.location(in: content))` is true; every other recogniser begins as before.
- `pressed(_:)`: `contentView.press(press.state, at: press.location(in: contentView), hit: point(at: press.location(in: contentView)))`.
- `dragged(_:)`: the same for the handle drag.
- `tapped(_:)`: `let p = point(at: tap.location(in: contentView))`; `switch ScreenSelecting.tap(selection: selection, at: p)`:
  `.menu` → `contentView.showMenu(at:)`; `.clear` → `actions?.select(nil)`; `.focus` → `actions?.tap(p)`.
- `layoutSubviews`: one line after `cell = now`, `contentView.geometry = ScreenTextGeometry(cell: now, first: layout.firstRow, columns: picture.columns, rows: rows)`;
  in the redraw, `if redraw { report(); contentView.laidOut() }`.
- `windowView` no longer passes `highlights:`.
- `doubleTapped` and `pinched` do not change (D11).

### 5.4 The page — `ios/Tortie/Screens/Screen.swift` (builder **select**)

- `@State private var selection: ScreenSelectionRange?`.
- The toolbar's Copy item (`:359-369`) and the overlay's (`:479-491`) are removed; `TerminalChrome` loses `toolbarCopy` and
  `overlayCopy`; comments at `:52-53`, `:233-240`, `:253-257`, `:262` say the edit menu is Copy.
- `ScreenScroller(…, selection: selection, actions: ScreenScrollerActions(tap: { point in tapped(point, picture: picture) }, select: { selected($0) }, copy: { copySelection() }, overlap: { overlap = $0 }))`.
- `selected(_ range: ScreenSelectionRange?)`: a selection beginning (`range != nil` while `selection == nil`) holds the
  picture and sets `scrollback.selecting = true`; nil lets go (`scrollback.selecting = false`, `model.letGo()`).
- `copyDrawn` stays (`selection.map { scrollback.drawn($0, picture: model.picture) } ?? false`; rule as8 reads `.drawn(`).
- `copySelection()` as today, then `selected(nil)`.
- `tapped(_:picture:)` raises the keyboard only (the table moved to the scroll view).
- `onChange(of: scrollback.mode)` (`:412-420`) as today with `selection != nil` and `selected(nil)`.

### 5.5 The window of rows and the identifiers (builder **select**)

`ios/Tortie/Screens/ScreenGrid.swift`: `ScreenWindow` loses `highlights`, its overlay and `ID.screenSelection` (D15).
`ios/Tortie/Screens/Identifiers.swift`: `screenSelection` removed; `screen-copy` documented as "`Copy`, the edit menu's one
item over a selection; a menu item".

### 5.6 What the phone does in each case

| Case | Today (build 11) | After |
| --- | --- | --- |
| Long press on a word | one cell selected, Copy in the top bar | the word selected, handles, loupe, the menu's Copy |
| Long press and slide | the cells from the pressed one to the finger | the word and the cells to the finger |
| Drag a handle | (no handles) | that end follows the finger; the menu when it stops |
| Selection over a reserved row | no Copy until it lands | no menu until it lands, then the menu appears by itself |
| Tap with a selection | clears it | on it: the menu; elsewhere: clears it |
| Tap with none | the keyboard | the keyboard |
| Double tap / pinch / pan | zoom / zoom / scroll | the same, a selection kept |
| Keyboard up, long press | selects, keyboard stays | selects, keyboard stays |
| Sideways | Copy at the bottom right | the menu's Copy over the selection |
| Copy | clipboard, selection cleared | the same text, the same clear |

---

## 6. The gates, clause by clause

### 6.1 `conformance:ios` (`build/conformance-ios.mjs`, builder **gates**)

- **(al) widened, THE PASTEBOARD AND THE EDIT MENU.** al1 as today (UIPasteboard named in `Screens/ScreenSelection.swift`
  alone, written once, never read). NEW: `UIEditMenuInteraction(` made exactly once in the app, in
  `Screens/ScreenTextInput.swift`; `editMenuInteraction(_:menuFor:suggestedActions:)` declared once there, its body naming
  `suggestedActions` nowhere and returning only `UIMenu(children: [])` or `UIMenu(children: [<one name>])` whose one element
  is a `UIAction(title: Copy.copy, …, identifier: UIAction.Identifier(ID.screenCopy))`, the Copy return behind a `drawn(`
  test; no `UITextInteraction`, `UIMenuController`, `UIDragInteraction`, `textDragDelegate`, `UIActivityViewController`,
  `ShareLink`, `UIReferenceLibraryViewController`, `translationPresentation` or `import Translation` in any `Screens/Screen*`
  file but `ScreenKeyField.swift`'s existing drop refusal; `ScreenTextContent` overrides `canBecomeFirstResponder` to
  `false`, answers `writingToolsBehavior` `.none`, and its `insertText`, `deleteBackward` and `replace(_:withText:)` bodies
  are empty. Self-tests: the honest shape passes; each break below is caught.
- **(aq) widened.** aq1, aq2, aq4 to aq11 as today. aq3: the long press stays (`longPressSeconds`, on the scroll view, read in
  the content view); NEW, exactly one `UIPanGestureRecognizer` made in `ScreenScrollView` (the handle drag), added to the
  scroll view itself, its point read with `location(in: contentView)`, and `panGestureRecognizer.require(toFail:` it; the
  content view is `ScreenTextContent()`; every `addInteraction(` in a Screen file is on the content view, inside
  `ScreenTextContent`, and its arguments are the display interaction and the edit menu interaction only.
- **(as) widened.** as8 as today (`hit`'s `first:`; `copyDrawn` reads `.drawn(`). NEW: `layoutSubviews` hands
  `contentView.geometry` and calls `contentView.laidOut()`; `laidOut()` calls `setNeedsSelectionUpdate()`.
- **(ax) moved.** `CHROME_MEMBERS` loses `toolbarCopy` and `overlayCopy`; ax4 is replaced: `ID.screenCopy` is named only in
  `Screens/Identifiers.swift`'s declaration and in `Screens/ScreenTextInput.swift`'s menu action, and no `Button` in
  `Screens/Screen.swift` draws `Copy.copy`.
- `SCREEN_FILES` and `OWNER_CHECK_ABSENT` gain `Screens/ScreenTextInput.swift`.
- (k), (b), (c): no change to the rules; the new file must pass them (D21; `UIColor(Tokens.accent)`; `Copy.copy`).
- The header gains a "PHASE 337.5" paragraph listing what moved.

### 6.2 `ablation:p316` (`build/p316/ablation-ios.mjs`, builder **gates**)

Re-point or retire every arm whose text this phase removes (`aq8` keeps `press.location(in: contentView)`; the selection arms
at `:3168-3180` follow `copyDrawn`'s new text; `ax`'s `if chrome.toolbarCopy(copyDrawn) {` arm at `:4094` is replaced by "a
Copy button back in the toolbar"). NEW arms, each red on the clause that owns it: a second menu item (Share); the suggested
actions returned; Copy offered with the drawn test removed; `UITextInteraction` added to the content view; Writing Tools left
`.default`; the content view allowed to become first responder; the scroll view's pan no longer waiting for the handle drag;
the handle drag added to the content view; `laidOut()` no longer asking `setNeedsSelectionUpdate()`; a Copy `Button` back in
`ScreenPage`'s toolbar; `UIPasteboard` named in `ScreenTextInput.swift`. At least eleven, so the lighter checking's three are
exceeded on the clauses that carry the Tier 2 condition.

### 6.3 `conformance:phonecopy`

No word moves (`Copy.copy` stays and is used); it is run and must stay green.

### 6.4 What does not move

`src/**`, `docs/audits/contract-baseline.txt`, `Style/Copy.swift`, `PHONE_BUILD`, `CURRENT_PROJECT_VERSION`, the door, every
Mac menu, `probe:p316` and `P316DriveUITests.swift`.

---

## 7. The proof, run rather than read

### 7.1 The battery (the integrator)

`npm run typecheck`, `npm run build` (gate:electron, gate:background, gate:simulator, gate:checks, conformance:ios and the
other build gates inside it), the whole vitest under a scratch HOME, `conformance:ios`, `conformance:phonecopy`,
`ablation:p316` (whole), `gate:simulator`, `gate:checks`, `gate:electron`, `gate:background`, `test:ios` on 26.3 and with
`P316_RUNTIME=18.3`, and `node build/p3375/probe-p3375.mjs --grader-self-test`.

### 7.2 XCTest (builder **select**)

- `ScreenSelectionTests.swift` rewritten: the word rule (a path whole; a blank cell alone; a wide cell's two columns); carets
  to cells and back; `extending` and `moving` (crossing swaps); the tap table; the text by absolute index and Copy waiting on
  a reserved row (kept); the pasteboard written once and never read (kept, with `ScreenTextInput.swift` in its file list).
- NEW `ScreenTextInputTests.swift`, the view mounted in the host app's window as `ScreenScrollerTests` mounts it, at the 337
  build's geometry (120 × 40, 6.67 pt rows) over committed screens with history (`build/fixtures/screen/` through
  `ScreenSample`): a press selects the word (`/usr/local/bin/...`-shaped cells); `selectionRects` equal `ScreenSelecting.rects`
  by absolute index, `containsStart`/`containsEnd` on the right rows; after a page reserved above and after an eviction with
  the content size unchanged, the rects follow their rows; `menuFor` returns exactly one `UIAction`, titled `Copy.copy`,
  identified `ID.screenCopy`, when every row is drawn and `UIMenu(children: [])` over a reserved row; an owed menu is
  presented by `laidOut()` once the row lands; Copy calls the page's copy once; the display interaction and the edit menu
  interaction are the content's only interactions and no `UITextInteraction` exists in the view tree; the content view
  cannot become first responder, answers `writingToolsBehavior` `.none`, and inserting text changes nothing; a selection
  beginning holds the picture and a clear lets it go.
- `TerminalChromeTests.swift` loses the two Copy members' tests and asserts the page draws no `ID.screenCopy` button.
- `ScreenScrollerTests.swift:122` builds the new actions; one new test: the scroll view's pan requires the handle drag to fail,
  and a drag that does not begin near a handle scrolls.

### 7.3 `probe:p3375` — the app run (builder **probe**, driven by the verifier)

`build/p3375/probe-p3375.mjs` and `ios/TortieUITests/P3375SelectUITests.swift`. No door, no Mac, no Electron, no model
turn: the UI test launches the app with `-TortieDebugForgetPairing`, presses `pairing-see-sample`, opens `row-sample-1`
(80 × 30, one page of 60 history rows, `ios/Tortie/Sample/sample.json`) and drives the Terminal. Builds through
`xcodebuildRun` (HEAD Debug build-for-testing, and with `P3375_PARENT_IOS` the parent's `ios/` copied into the run directory
with HEAD's `P3375SelectUITests.swift` added, built the same way); devices one at a time through `withSimulator` on 26.3 and
18.3; one test method per arm so the pasteboard is read by the handle's `pasteboard()` after each; every expected text
RE-DERIVED by the probe from `sample.json` (never read from the app). Arms, HEAD:

| Arm | What is read | Pass |
| --- | --- | --- |
| N1 | long press on a word of a live row | the menu up with exactly one item, label `Copy`; none of `Share…`, `Translate`, `Look Up`, `Search Web`, `Speak`, `Writing Tools`, `Select All`, `Cut`, `Paste` anywhere in the app's elements; Copy pressed, the pasteboard equals the probe's own word of that row |
| N2 | press and slide along a row | the pasteboard equals the probe's cells from the word to the end column |
| N3 | the end handle dragged three rows down | the pasteboard equals those rows by the absolute-index rule |
| N4 | scroll up into history, select a history row's word, drag the end handle across into the live rows | the pasteboard equals the history rows then the live rows, a wide character once where the sample has one |
| N5 | keyboard up (tap), then a long press | the selection made, the key bar still up, Copy works |
| N6 | sideways, a long press | the menu's Copy present and hittable; pasteboard as N1; no `screen-copy` button in the tree |
| N7 | a tap on the selection, then elsewhere | the menu shown; then no menu, no selection, no keyboard |
| G1 to G5 | at HEAD AND the parent: a tap raises the key bar; a double tap changes the row height and back; a pinch changes the row width; a swipe down draws `screen-history-` rows and the arrow back to live; a tap with a selection clears it without the keyboard | HEAD equals the parent on every one (frames within a pixel) |
| RUN | 0 `p316-` devices made by the run left; the pasteboard read only by the handle; his history unmoved | |

`--grader-self-test` grades recorded fixtures (every clause shown red on its own break) and boots nothing. Header in the house
shape (what it drives, what it refuses, its environment: `P3375_PARENT_IOS`, `P3375_ARMS`, `P3375_KEEP`). It reaches
`build/simulator-run.mjs`, so `SIMULATOR_USER_FLOOR` in `build/assert-simulator-teardown.mjs` rises 4 to 5 in the same commit;
`package.json` gains `"probe:p3375": "node build/p3375/probe-p3375.mjs"`; `build/verification-checks.mjs` classifies it as a
verifier-only Simulator probe.

### 7.4 What the verifier must produce

`probe:p3375` whole on 26.3 and 18.3 beside the parent (`0b87d0af`'s `ios/`), every arm's verdict; the battery once; and
the independent method below. A verdict whose evidence is only the builders' checks re-run is not a verification.

### 7.5 The independent method: the attack

Try to make the Terminal send his words anywhere but the clipboard, or copy a blank: (1) read the menu with XCUITest on both
runtimes after every way a menu appears (press, slide, handle drag, tap inside, owed after a page, sideways) and look for ANY
item but Copy; (2) drag a handle onto rows reserved above (scroll up fast so a page is still in flight) and press Copy the
moment it appears, and compare the pasteboard with the probe's text; (3) plant each break of §6.2 in a clone and see the gate
go red; (4) with a hardware keyboard (the Simulator's), press ⌘C with a selection held and read the pasteboard (stated: it is
the hidden field's empty selection, as today).

### 7.6 No regression against today

Every row of §5.6's table at the parent and HEAD; G1 to G5 equal; nothing on the Mac moved.

---

## 8. The CHANGELOG item (the integrator)

Under `## Unreleased`, `### Added`:

`- On iPhone you can now select text in a session's terminal the iPhone way: press on a word, drag the handles across rows and into earlier output, and Copy from the menu above it`

(the commit link is added by the follow-up, CLAUDE.md "Release notes").

## 9. CLAUDE.md (the integrator)

One row in "Probes and app runs": `probe:p3375` — when: `ios/Tortie/Screens/ScreenTextInput.swift`,
`ScreenSelection.swift`, the selection wiring in `ScreenScroller.swift` and `Screen.swift`, or `build/p3375/**`; cost: the
§14 numbers until measured; what it is: §7.3 in one paragraph.

---

## 10. Builders, disjoint files, and who owns what is shared

| Builder | Files (each in exactly one list) | Task |
| --- | --- | --- |
| **select** | `ios/Tortie/Screens/ScreenSelection.swift`, `ios/Tortie/Screens/ScreenTextInput.swift` (new), `ios/Tortie/Screens/ScreenScroller.swift`, `ios/Tortie/Screens/Screen.swift`, `ios/Tortie/Screens/ScreenGrid.swift`, `ios/Tortie/Screens/Identifiers.swift`, `ios/TortieTests/ScreenSelectionTests.swift`, `ios/TortieTests/ScreenTextInputTests.swift` (new), `ios/TortieTests/TerminalChromeTests.swift`, `ios/TortieTests/ScreenScrollerTests.swift` | §5 and §7.2 |
| **gates** | `build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs` | §6.1, §6.2 |
| **probe** | `build/p3375/probe-p3375.mjs` (new), `ios/TortieUITests/P3375SelectUITests.swift` (new), `package.json`, `build/verification-checks.mjs`, `build/assert-simulator-teardown.mjs` | §7.3 |
| integrator | `CHANGELOG.md`, `CLAUDE.md`, this file's "§As built" | §8, §9 |

The names §5 pins (`ScreenTextContent`, `ScreenTextGeometry`, `ScreenCaret`, `ScreenTextPosition`, `ScreenTextRange`,
`ScreenSelectionRect`, `ScreenSelectionEnd`, `ScreenTap`, `ScreenTextEvents`, `press(_:at:hit:)`, `grabs(at:)`,
`drag(_:at:hit:)`, `showMenu(at:)`, `selectionChanged()`, `laidOut()`, `ScreenSelecting.word(at:cells:)`,
`ScreenSelecting.tap(selection:at:)`) are what the gates builder writes its rules against; a builder that must rename one says
so in its report and the integrator reconciles.

## 11. What this sends to other phases and the main session

- **337.2** (probe repairs, not queued) inherits the `probe:p316` screen-group clauses this phase changes the ground under,
  none of them run here. The menu's Copy carries `screen-copy` as its accessibility identifier and XCUITest reads it on
  26.3 and 18.3 (§14 M8), so `screenSelect`, `keyboardGlitch` and `landscapeSelect` still find and press Copy by
  `element(Seen.screenCopy)` and PS6's "Copy drawn" holds; what moves is PLACEMENT: PS14's "Copy beside the ⋯" (fixture
  `:7401`; Copy is now over the selected row, not in the bar) and `gradePl3`'s "ONE Copy inside the grid" (the menu sits
  over the selection, usually inside the grid, not at a fixed corner). `screenReading`'s `selection` key reads `false`
  after this phase (`ID.screenSelection` is gone) and no grader reads it.
- **346 and 333.4.1**: §4's merge notes.
- **The main session**: no build number, no release.

## 12. What is NOT in this phase

- **No wrapping**, in the Terminal or on a Read page (his answers 1 and 4).
- **No Mac change**, no route, no door field, no `src/` file.
- **No change to how the Terminal opens or zooms**; the double tap stays zoom (not word select); Catch Me Up stays under ⋯.
- **No Share, Translate, Look Up, Search Web, Speak or Writing Tools**, and **no Select All**.
- **No autoscroll** at the view's edge, no paste, no edit of the Terminal's text, no VoiceOver selection work.
- **No `probe:p316` or `P316DriveUITests.swift` edit** (§11), no build number, no screenshot, no physical device, no release.

## 13. Open concerns handed to the verifier

1. The handles' reach (22 points) at the fitted 3.33 × 6.67 pt cell covers several cells; a press near the end caret of a
   one-character selection starts a handle drag rather than a scroll. Measured acceptable in the scratch app; the verifier
   reads it at the sample's 80 columns.
2. The menu is owed only while a page is in flight; a selection over rows paging has stopped for (the edge line shown) never
   offers Copy until he goes back to live, which clears it (D13). That is today's rule (Copy is not drawn), stated.
3. A hardware keyboard's ⌘C goes to the hidden key field, as today (§7.5 (4)).
4. iOS 27 is unmeasured (Xcode 27 needs macOS Tahoe, 333.4's note).
5. **Sideways is unmeasured by this step** (§14 M7): the scratch harness computed a row it could not address sideways on
   either runtime. N6 is the first reading; if the menu sideways offers anything but Copy, the phase is Tier 3 and stops.
6. **One pasteboard read came back empty** (`simctl pbpaste` after 26.3 run 4's `testI_displayBasic`, where the
   app had written `/usr/local/bin/tool-1185`; the same test's read in run 3 held it). The probe reads the pasteboard inside
   the arm (an ack file the UI test waits on, as `probe:p316` does) and an empty read is UNREADABLE, never a pass or a fail.
7. Writing Tools did not appear on these Simulators in any menu; on a device with Apple Intelligence the system would
   SUGGEST it (it is in the suggested list, `showWritingTools`), which (B) never returns, and `writingToolsBehavior` is
   `.none` besides.

## 14. What the spec step measured, how, and the numbers

**Where.** Everything under `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3375/spec/`:
`probe/` (the scratch Xcode project: `Probe/ProbeApp.swift`, `Probe/Grid.swift` for (A) and the grid, `Probe/Display.swift`
for (B), `ProbeUITests/MeasureUITests.swift`), `build.mjs` (one `xcodebuildRun` build-for-testing, generic Simulator),
`measure.mjs` (one `withSimulator` device per run, one `test-without-building -only-testing:` per drive, the handle's
`pasteboard()` after each), the raw `results-*.txt` lines (`P3375M|<drive>|<step>|<json>`) and `summ.py`/`lolli.py` that read
them. The worktree was never built and no file of the tree was edited by the measurement. Derived data and Simulator scratch
(`dd-probe*`, `sim-*`, about 820 MB) were deleted at the end; `xcrun simctl list devices | grep -c p316-p3375` read 0.

**The scratch app** draws 1,240 rows (history from index 1,000, live rows 1,200 to 1,239) of 120 columns at the fitted cell
(3.33 × 6.67 pt on an iPhone 16 Pro), as `ScreenScroller.swift` lays them out: a `UIScrollView` with
`contentInsetAdjustmentBehavior = .never`, one non-interactive `UIHostingController` drawing the rows in view with an opaque
ground, the scroll view's pinch, double tap (fitted ↔ 12 pt) and single tap (keyboard, requiring the double to fail), a hidden
1 pt `UITextView` owning the keyboard as `ScreenKeyField` does, a toolbar `Reserve` button that lays out 100 rows above with
the offset moved by their height (filled 1.5 s later), and an optional reserved live row filled 4 s after a selection spans it.
Variants by launch argument: (A) with the content view refusing or accepting first responder (an empty `inputView`), the menu
the system's default or narrowed by `editMenu(for:suggestedActions:)` with or without `canPerformAction`; (B) with or without
the relayout call.

**Builds.** `node build.mjs`: exit 65 twice in 5.3 s (`copy(_:)` must be `override` on a `UIView`), then exit 0 in 3.2 to
18.1 s for each of six builds. A get-only `@objc var writingToolsBehavior` warned "nearly matches optional requirement" and
was replaced by `{ get { .none } set {} }`, which did not warn; `UIEditMenuInteractionDelegate` warned under complete
concurrency checking (D22).

**Runs** (iPhone 16 Pro, every device `p316-p3375-spec-…`, made and deleted by `withSimulator`; lock slot `electron.lock`,
taken and released on the run's own command line each time):

| Run | Runtime | Drives (exit, ms) |
| --- | --- | --- |
| 1 | 26.3.1 | A 0 36,326; B 0 89,540; C 0 28,124; D 0 27,865; E 0 21,545; F 0 23,887 |
| 2 | 26.3.1 | A2 0 45,824; B2 0 117,028; G 0 116,124; E 0 27,542; H 0 25,222; C2 0 30,995; F2 0 31,708 |
| 3 | 18.3.1 | G 65 146,594 (the harness's sideways step failed and left the device sideways, so this run's later drives are discarded; G's upright steps are kept) |
| 4 | 18.3.1 | I 0 58,563; H 0 30,181; G 0 111,461; A2 64 580 (a result bundle name reused, nothing ran); G2 0 115,604; B2 0 108,780 |
| 5 | 26.3.1 | I 0 50,831; H 0 38,100; G 0 128,714; G2 0 126,297 |
| 6 | 18.3.1 | L 0 43,568; I 0 28,295; A2 0 31,004; B2 0 109,693 |
| 7 | 26.3.1 | L 0 35,391; I 0 35,942 |

Drives: A/A2 (A) default menu, without/with first responder; B/B2 (A) narrowed, the full gesture drive, without/with; C/C2
(A) narrowed to the system's own Copy command; D (A) narrowed, with; E (A) a reserved row; F/F2 (A) `editMenu(for:)` alone;
G (B) the full drive; G2 (B) without the relayout call; H (B) a reserved row; I (B) the keyboard drive; L (B) sideways.

**The readings that decide the phase.**

- **M1, (A) needs first responder.** A, B, C, E, F (26.3): every long press selected nothing; the event log shows UIKit asking
  the content view to `becomeFirstResponder` and being refused. B: 0 of 2 single taps and 0 of 2 double taps reached the
  Terminal's recognisers (UIKit's `UITextTapRecognizer taps=1` and `taps=2` on the content view took them); pinch and pan
  worked. UIKit installs on the content view: `UITapAndAHalfRecognizer`, `UIVariableDelayLoupeGesture` (0.5 s),
  `UITextTapRecognizer` ×2 (double, single), `UITextRangeAdjustmentGestureRecognizer`, a link tap, and click and press drivers.
- **M2, (A) with first responder** (A2, B2, C2, D, F2 on 26.3; A2, B2 on 18.3): the word selected, loupe and handles shown;
  a long press while typing made the content view first responder and put the keyboard away (`typing` false); the double
  tap selected the word `1225:16-40` instead of zooming (0 zooms, both runtimes); an end-handle drag of 3 rows (20 pt)
  moved the end to `1205:60`, on the same row; the start handle held at the top reached `1132:9` (26.3) / `1130:9` (18.3)
  with no autoscroll.
- **M3, the menu.** (B), every state a menu was up upright, both runtimes: `app.menuItems` labels exactly `["Copy"]`,
  hittable (26.3 at `[63, 544, 67, 47]`, 18.3 at `[59, 549, 68, 51]` over row 1205). (A) narrowed by `editMenu(for:)` alone
  (F2) or with `canPerformAction` (D, B2) also read `["Copy"]`. **(A) default (A2), 26.3 and 18.3: `["Copy", "Translate",
  "Share…"]`**, and its suggested list (26.3): Cut, Copy, Paste, Delete, Select, Select All, Replace…, 简⇄繁, Insert Drawing,
  Writing Tools, AutoFill/Scan Text, Format (Bold, Italic, Underline, Writing Direction, More…), Find Selection, Look Up,
  Translate, Learn…, Speak, Speak…, Pause, Share…; `canPerformAction` was asked `_define:`, `_share:`,
  `captureTextFromCamera:`, `copy:`, `cut:`, `select:`, `selectAll:`.
- **M4, Copy.** Every Copy wrote what the app selected, read back by `pasteboard()`: `/usr/local/bin/tool-1205` (a word, one
  press); `L1206 alpha1206 /usr/local/bin/tool-1206 --flag=2 done.` (press and slide, `1206:0-71`); 77 rows from `1132:9`
  to `1208:60` including `W1133 中文 wide cells` (each wide character once); the reserved-row drive's five rows after the fill.
  Every read after a Copy held the copied text but one (run 7, I), which read empty (§13 item 6).
- **M5, (B) beside the gestures** (G on both runtimes; G2 on both): single tap with no selection raised the keyboard (335 pt
  26.3, 336 pt 18.3); with a selection it cleared it and raised nothing; double tap zoomed 3 of 3 with a selection kept;
  pinch zoomed 4 of 4; swipes scrolled (offset 876 → 375 → 1196 on 26.3); 100 rows reserved above moved the offset by
  exactly their height (800 pt at 8 pt rows on 26.3, 866.7 pt at 8.67 pt rows on 18.3), the selection still `1210:16-40` by absolute index, its handles on
  it. Handle positions read inside the app after every step matched the selection's ends within 1.0 pt, with the relayout
  call (G) and without it (G2).
- **M6, (B)'s handles and loupe.** End handle 3 rows down: `1205:16-1208:60` exactly, both runtimes; start handle to the
  top: `1132:9` (26.3) / `1129:9` (18.3), no autoscroll (offset unchanged); a loupe view present in the window during every
  press (`loupeSeen` true from the first press). The content view never became first responder (`fr.content` false in
  every reading).
- **M7, sideways.** The L drive turned the device sideways (grid `[62, 44, 750, 337]` on 18.3, `[62, 78, 750, 304]` on 26.3,
  12 pt cells) but computed a row element (`row-1134`, `row-1136`) XCUITest did not find, so no press was made: UNMEASURED.
- **M8, the identifier.** `UIAction.identifier` alone gave XCUITest an EMPTY identifier (run 4 and 5); with
  `action.accessibilityIdentifier = "screen-copy"` XCUITest read `Copy#screen-copy` on 26.3 and 18.3 (runs 6, 7).
- **M9, the owed menu** (H, both runtimes): a selection spanning reserved row 1207: no menu; the row filled 4 s later and the
  menu came up with `Copy` with no touch (`menuAsks` 1 → 2); Copy then wrote the five rows; a tap inside the selection
  presented the menu (twice: UIKit dismissed it on the touch and the tap presented it again); a tap outside cleared.
- **M10, z-order.** The highlight view `_UITextSelectionHighlightView` at index 1 of the content view's subviews, above the
  rows' hosting view at index 0 (opaque black ground); handles in a range-adjustment container at index 5.

**S9, his shell history.** `stat -f '%z %m'` read `737736 1792023873` / `23166 1790702242` at the start and unchanged
across runs 1 and the builds; `~/.zsh_history` then moved to `738080 1792173620` (14:00:20, while run 2's last UI test drove
the scratch app, which starts no shell), to `738161 1792173656` (14:00:56, with nothing of this step running but read-only
commands) and to `738492 1792174054` (14:07:34, during run 3); it read `738492 1792174054` before and after runs 4 to 7 and
at the end. `~/.bash_history` never moved. Every run set `HISTFILE=/dev/null` and unset `TERM_SESSION_ID`; none starts a
shell (xcodebuild, simctl, XCUITest and the scratch app). The 14:00:56 move with nothing running makes his own terminal (or
another session's interactive shell) the writer; reported, not proved.

**Locks.** `electron.lock`, taken by `lock.sh try p3375` at about 13:48, 13:57, 14:01, 14:10 and 14:24 and released on the
same command line each time; `lock.sh status` read it free at the end.

**Disk.** `df -h /`: 115 Gi free at the start, 96 Gi at the end.

## 15. Questions for him

1. **Select All in the menu?** Recommended: no (D19). Copy alone; a long selection is made with the handles.
2. **A word is everything between two spaces** (a path, a URL or a flag in one press), not the iPhone's usual word, which
   stops at `/` and `-`? Recommended: yes (D4).

---

## §As built (the integrator, 2026-10-16)

**What landed in the worktree** (`git diff 0b87d0af` plus the untracked new files; nothing committed, staged or stashed):

| Builder | Files |
| --- | --- |
| select | `ios/Tortie/Screens/ScreenSelection.swift` (rewritten), `ios/Tortie/Screens/ScreenTextInput.swift` (new, 596 lines), `ios/Tortie/Screens/ScreenScroller.swift`, `ios/Tortie/Screens/Screen.swift`, `ios/Tortie/Screens/ScreenGrid.swift`, `ios/Tortie/Screens/Identifiers.swift`, `ios/TortieTests/ScreenSelectionTests.swift` (rewritten, 12 tests where the parent had 9), `ios/TortieTests/ScreenTextInputTests.swift` (new, 10 tests), `ios/TortieTests/TerminalChromeTests.swift` (6 tests, the two Copy members' replaced by `testThePageDrawsNoCopyButton`), `ios/TortieTests/ScreenScrollerTests.swift` (25 tests where the parent had 24: the actions' shape at `:122` and `testThePanWaitsForTheHandleDragAndADragOffAHandleScrolls`) |
| gates | `build/conformance-ios.mjs` (+755 / −53), `build/p316/ablation-ios.mjs` (+243, 22 new arms) |
| probe | `build/p3375/probe-p3375.mjs` (new, 1,327 lines), `ios/TortieUITests/P3375SelectUITests.swift` (new, 723 lines, picked up by the project's synchronized group, no `project.pbxproj` edit), `package.json` (`probe:p3375`), `build/verification-checks.mjs` (`xcode('probe:p3375', …)`), `build/assert-simulator-teardown.mjs` (`SIMULATOR_USER_FLOOR` 4 → 5) |
| integrator | `CHANGELOG.md` (one item under Unreleased, Added), `CLAUDE.md` (the `probe:p3375` row; the conformance:ios row's Phase 337.5 sentence and `ablation:p316`'s count, 595), this section |

`git diff 0b87d0af -- src/ docs/audits/contract-baseline.txt` is EMPTY (0 lines): the second Tier 2 condition holds.
`CURRENT_PROJECT_VERSION` reads 11 in all six configurations of `ios/Tortie.xcodeproj/project.pbxproj` (`:417`, `:449`,
`:479`, `:501`, `:522`, `:543`); `PHONE_BUILD` did not move.

**Where the build departs from §5, each the builder's, each reconciled here.**

1. **The two interactions join the content view in `didMoveToWindow`, not `init`** (select). Added in `init`, UIKit's
   highlight and handle views sat at content subviews 0 to 5, under the rows' opaque hosting view at 6: drawn and never seen.
   Added when the view first joins a window, the host is at 0 and the highlight at 1 on 26.3 and 18.3, as §14 M10 measured;
   `ScreenTextInputTests.testTheHighlightIsAboveTheRows` holds the highlight and both handles above the rows. Rule (aq) reads
   every `addInteraction(` inside `ScreenTextContent`, on itself, wherever in the class it sits, so the gate did not move.
2. **`tintColor = Token.accent.uiColor`** in place of §5.2's `UIColor(Tokens.accent)`, because rule (a) refuses `UIColor(`
   outside `Tokens.swift`; `MessageStrip` already uses this form.
3. **`ScreenGestureRules` holds `weak var contentView` and `weak var handle`** (§5.3 said `content`), so every
   `location(in:)` in `ScreenScroller.swift` still names `contentView`, which (aq3) requires.
4. **The content sets its own `selection` at once on each press and handle step, then tells the page**; the page's answer
   comes back through the scroll view with the same range (the page's `selected(_:)` and the content's `choose(_:)` each
   drop an unchanged range). So the next drag step reads where the last one left it.
5. **UIKit adds three private interactions beside `UIEditMenuInteraction`** (`_UIEditMenuBridgedContextMenuInteraction`,
   `_UIClickPresentationInteraction`, `_UIClickPresentationFeedbackGenerator`), so the unit test compares the content's
   interactions with those a plain view gets from one `UIEditMenuInteraction`, rather than counting two, and finds no
   `UITextInteraction` or `UIDragInteraction` anywhere in the window.
6. **A menu UIKit asks for over undrawn rows is owed too** (the delegate's `menuFor` sets `owed`), besides `showMenu(at:)`'s.
7. **Additions**: `ScreenSelecting.text(_:columns:cells:)` (the rows version calls it), `ScreenCaret.precedes` and
   `ScreenSelectionRange.precedes`. The planted eviction in `testTheRectanglesFollowTheirRowsByAbsoluteIndex` showed UIKit
   does NOT re-read the rectangles by itself when the first index moves with the content's size unchanged; they move only
   after `laidOut()` asks, on both runtimes, which is D12's reason measured in the tree.
8. **Rules (z) and (ap) take ONE exception, `isMarkedTextStyleKey`** (gates). `UITextInput` REQUIRES
   `var markedTextStyle: [NSAttributedString.Key: Any]?` and the type has no other spelling, while (z1) and (ap) refuse
   `NSAttributedString` app-wide. The exception admits exactly that one line of `Screens/ScreenTextInput.swift` (a stored
   var, or `{ get { nil } set {} }`); ablation arms `z7` (an attributed string made beside it) and `ap4` (the key type
   declared for something else in the same file) are red, so every other naming is still refused.
9. **(al) refuses more than §6.1 listed** (gates): `UIEditMenuInteraction` made with a nil delegate; `return nil` from
   `menuFor`; `UICommand`, `UIKeyCommand` and `UIDeferredMenuElement` inside it; any `becomeFirstResponder()` in the file;
   `writingToolsBehavior` set to anything but `.none` in any Screen file; and `UIActivityItemsConfiguration`,
   `activityItemsConfiguration`, `UIDocumentInteractionController`, `TranslationSession`, `UITextDragDelegate` and
   `textDragInteraction`. (ax) requires `accessibilityIdentifier = ID.screenCopy` on the Copy action (§14 M8), and (aq)
   requires the handle drag's delegate to be `ScreenGestureRules`, whose `gestureRecognizerShouldBegin` calls `grabs(at:`.
10. **The probe** (probe) also passes `-TortieDebugStill`, as `probe:p316` does, so XCUITest sees the app go idle; writes a
    plan of candidate words per arm and takes the first one drawn in view clear of the top line, the keyboard, the key bar
    and the back-to-live button, printing the labels of the rows it pressed (a label not the sample's own for that index is
    UNREADABLE); reads the pasteboard before each arm too (a read that already holds the arm's text is UNREADABLE) and
    retries an empty read after Copy twice, a second apart, before UNREADABLE; grades "within a pixel" as a third of a
    point; reads a parent's G arm that fails its own conditions as UNREADABLE, never FAIL; refuses a "parent" holding
    `ScreenTextInput.swift`; adds `P3375_RUNTIMES`, `P3375_RUN_DIR`, `P3375_DERIVED_DATA`, `P3375_PARENT_DERIVED_DATA` and
    `--preflight`. The sample holds no wide character, so N4's "a wide character once" is said, not checked.

**The integrator's own decisions.** The CHANGELOG item is §8's with "On the iPhone", as the items above it write the phone:
`- On the iPhone you can now select text in a session's terminal the iPhone way: press on a word, drag the handles across
rows and into earlier output, and Copy from the menu above it` (one line in the file, no full stop, so the follow-up adds the
commit link). The `probe:p3375` row sits in CLAUDE.md's "Probes and app runs" table after `measure:p3471`, its cost "not yet
measured" with §14's per-drive numbers; the conformance:ios row gains one Phase 337.5 sentence before `ablation:p316`'s,
and the arm count reads "595 since Phase 337.5's". No seam needed a code change: the gates read select's code as written,
and the probe's UI test names only identifiers `Identifiers.swift` declares (`screen-pairing`, `pairing-see-sample`,
`sample-bar`, `screen-list`, `screen-grid`, `screen-row-`, `screen-history-`, `screen-to-live`, `screen-line`,
`screen-scrollback-line`, `screen-key-bar`, `screen-key-hide`, `screen-copy`, `row-`), each counted there.

**The battery, run once by the integrator in `/private/tmp/wt-p3375`** (scratch
`.../scratchpad/p3375/integrator/`; every command with `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset where it starts a
process that could start a shell):

| Command | Exit | Numbers |
| --- | --- | --- |
| `df -h /` | 0 | 92 Gi free at 15:37, 87 to 91 Gi during, 80 Gi at 16:43 (other phases' builds running) |
| `git diff --stat 0b87d0af -- src/ docs/audits/contract-baseline.txt` | 0 | 0 lines |
| `npm run typecheck` | 0 | 2.8 s (incremental `tsc -b`); import boundaries 1,429 files 0 violations; 0 runtime cycles over 1,426 files |
| `npm run build` | 0 | 57.2 s; gate:electron 176 users against 176; gate:background 570 files, 3 long-lived starters each ended in a `finally`; gate:simulator 568 scripts, 5 users against a floor of 5; conformance:ios PASS, 51 rules over 54 app files, 75 test files and 143 files; gate:onlyadd PASS; conformance:harnessprobes 6 clauses green and 16 ablations red; contract-inventory byte for byte |
| `npm test` (scratch `HOME` and `ZDOTDIR`) | 0 | 21,428 passed, 14 skipped (21,442), vitest 117.2 s, 120 s in all |
| `npm run conformance:ios` | 0 | 6.5 s; 51 rules over 54 app files, 75 test files, 143 files |
| `npm run conformance:phonecopy` | 0 | 2.5 s, `phonecopy OK` |
| `npm run ablation:p316` (whole) | 0 | 3,643 s (60.7 min, beside another phase's run of it); **595 of 595 arms red on the rule that owns them** (594 distinct ids: `e20` is named twice, as at the parent, whose 573 arms hold the same pair), every rule (a) to (z) and (aa) to (ba) proved able to fail, the clone removed, the working tree unmoved |
| `npm run gate:simulator` | 0 | 0.7 s, 5 users against 5 |
| `npm run gate:checks` | 0 | 0.8 s, 272 check scripts classified, 53 `tsxCli()` importers against 53 |
| `npm run gate:electron` | 0 | 1.3 s, 176 against 176 |
| `npm run gate:background` | 0 | 1.8 s |
| `npm run test:ios` (26.3), slot `electron.lock3`, released on the same line (exit 0) | 0 | 347 s; Debug 906 tests, 0 failures, 98.8 s; Release 903 tests, 0 failures, 78.0 s; the Debug app's 11 Mach-O files with all 5 DEBUG seams, the Release app's 12 and the device archive's 1 with none, none linking NetworkExtension or TailscaleKit or carrying coverage; device `p316-99422-1` shut down and deleted; the build's one warning the existing `MacsTests.swift:876` |
| `P316_RUNTIME=18.3 npm run test:ios`, slot `electron.lock`, released on the same line (exit 0) | 0 | 322 s; Debug 906 tests, 0 failures, 97.3 s; Release 903 tests, 0 failures, 84.0 s; device `p316-52594-1` shut down and deleted |
| `node build/p3375/probe-p3375.mjs --grader-self-test` | 0 | 116 cases, every clause red on its own break and green on the honest reading; nothing booted |
| `node build/p3375/probe-p3375.mjs --preflight` | 0 | Xcode, both runtimes, the device type, the UI test and the sample present; nothing booted |
| `grep -n CURRENT_PROJECT_VERSION ios/Tortie.xcodeproj/project.pbxproj` | 0 | 11 in all six |
| `xcrun simctl list devices \| grep -c p316-` | 0 | 0 after each of this step's runs; at 16:43 it read 2, `p316-40351-2` and `p316-68384-3`, booted by the slot holders `p33341` (pid 40340) and `p346` (pid 68334), neither this phase's |

Test functions in `ios/TortieTests`, counted by this step: 908 at HEAD, 894 at the parent (+3 ScreenSelectionTests,
+10 ScreenTextInputTests, +1 ScreenScrollerTests). Scratch derived data (`dd-ti263`, `dd-ti183`, 1.0 GB each) deleted after
each run; the vitest scratch `home` and the logs are all that stay under the integrator's scratch.

**Not run by the integrator, by the brief**: `smoke:t1`, `smoke`, `smoke:t3`, `smoke:remote`, `smoke:machines`, and
`probe:p3375` itself (verifiers only). **The first sideways reading of the menu (N6) is still owed to the verifier**: if it
shows anything but Copy the phase is Tier 3 and stops (§13 item 5).

**His shell history.** `~/.bash_history` read `23166 1790702242` throughout. `~/.zsh_history` read `738630 1792177511` at
15:37 (the builders' last reading; the brief's `737736 1792023873` was already out of date, as the spec step and all three
builders reported) and stayed there across typecheck, build, vitest, every gate and both `test:ios` runs (15:37 to 15:54).
It then moved ACROSS the whole `ablation:p316` run (15:41:57 to 16:42:40): `738661 1792181222` at 16:15 (written 16:07:02),
and `738871 1792183350` at the end (written 16:42:30), 241 bytes in at least two writes. That run starts only `/bin/sh -c`
for npm, `node`, `cp` and `plutil`, none on a terminal and none interactive, with `HISTFILE=/dev/null` and no
`TERM_SESSION_ID`; at 16:15 the process table held fourteen interactive `zsh` shells on terminals (`ttys002` to `ttys036`),
twelve under his Tortie's tmux server (pid 7822) and two under `login` (pid 611), one of them (`ttys002`) started at
15:05:07, four seconds before the 15:05:11 move the builders saw. Attributed to his own interactive shells; reported, not
proved. After the move this step started nothing but read-only commands and this file's edit.

## §As built, the fix round (the fixer, 2026-10-16)

**The verdict it answers**: needs_work from the one verifier. Two majors (D20 did not hold: iOS read the content view as
ONE text view and hid every row element; a handle rested on for 0.45 s or longer was taken by the long press, which
replaced the selection with the word under the finger), one minor (the probe could not read anything without the rows,
and had no start-handle, held-handle or reserved-row arm), and two nits. The fix ran ONCE.

**It ran in two instances of the one fixer role.** The first (17:55 to 18:48) wrote every change below, measured it in
clones and through `probe:p3375`, and was stopped while its `test:ios` on 26.3 was booting a device: that run's
Simulator, `p316-49303-1` (`D871573C-2163-44A9-8F53-A55E6D6A5E59`), is still booted, and its lock slot
(`electron.lock2`, owner `p3375 18:45:22`) was still held. The second (from 19:13) read every changed file and every
log the first left, released that stale slot (its owner this role, its pid gone), did not touch the device (the main
session removes it by its UDID, as it removed earlier leftovers), and ran the battery and the whole probe again itself.
The first instance once imported `build/conformance-ios.mjs` to list its exports (`fixer/dbg.mjs`, 18:10), which the
brief forbids; nothing it measured rests on that import.

**What moved, file by file** (all of it inside this phase's own files; `Screen.swift`, `ScreenScroller.swift`,
`ScreenGrid.swift`, `Identifiers.swift` and `ScreenSelection.swift` did NOT move in the fix round, so 333.4.1's and
346's merge notes in §4 stand as written):

| File | Change |
| --- | --- |
| `ios/Tortie/Screens/ScreenTextInput.swift` | F1: `isAccessibilityElement`, `accessibilityTraits` and `accessibilityValue` overridden as getters answering `false`, `.none` and `nil`, each with a setter that keeps nothing; the D20 header paragraph rewritten. F2: `press(_:at:hit:)` asks `grabs(at:)` at `.began` and, near a handle, hands the whole press to the handle path (`pressHolds`, `takeHandle`, `moveHandle`, `letHandleGo`, shared with `drag`). 596 lines at the integrator, 667 now |
| `ios/TortieTests/ScreenTextInputTests.swift` | 12 tests where the integrator had 10: `testAPressThatBeginsOnAHandleTakesIt` (the verifier's H10, V8b and V9b in the tree: the end handle and the start handle each taken by a press, the other end kept, nothing moved until the finger does, the menu at the lift, and a press far from both still a new word) and `testAHandleIsTakenAtItsOwnCaret` (the M15 nit: each caret on its column's left edge and its row's band, a handle taken there, nothing past reach); `testTheContentIsNoEditorAndTakesNoWords` sets all three accessibility answers and reads them unmoved; `testAPressSelectsTheWordUnderIt` clears the selection before each later press, because a press beside a held selection's handle now takes it |
| `build/conformance-ios.mjs` | (al) gains al8 (D20): `ScreenTextContent` answers the three by getters that never ask UIKit's, each once, each with a setter that keeps nothing (`TEXT_SPOKEN_ANSWERS`), with its self-tests; the PHASE 337.5 header says so |
| `build/p316/ablation-ios.mjs` | al14 (`isAccessibilityElement` read back from `super`), al15 (`accessibilityValue` from `super`), al16 (the traits answer removed), each red on (al) |
| `build/p3375/probe-p3375.mjs`, `ios/TortieUITests/P3375SelectUITests.swift` | F3: N8 (the START handle dragged up into history), N9 (each handle taken again and RESTED ON a second before it moves), N10 (on the probe's own COPY of HEAD's `ios/` whose every sample page arrives 20 s late, planted in the copy's `Sample/SampleReader.swift`; the app ships no seam), G0 (at HEAD and the parent: no text view and no long value under the grid, every row element reading the sample's own label, the same rows by identifier and frame as the parent), and every N reading refuses a `screen-copy` BUTTON beside the menu upright as sideways; the self-test went from 116 cases to 157 |
| `CLAUDE.md` | the `probe:p3375` row (its measured cost, both instances' runs, the new arms, and the 18.3 log quarantine's one-arm rerun); the conformance:ios row's 337.5 sentence gains al8, and `ablation:p316`'s count reads 598 since this fix round |

**F1, D20, how it was found and why this answer.** In a clone of the tree (never the tree) the first instance built
the content view with five variants chosen by launch argument and read the grid's children with XCUITest on 26.3:
`isAccessibilityElement` answered `false` by a getter, the integrator's stored `false` kept,
`accessibilityElements` answered with the subviews, the display interaction left off, the edit menu interaction left
off, and both off. EVERY ONE read the grid's
one child as a text view (XCUIElement type 52) holding the whole text as its value, with no row under it, so neither the
two interactions nor the element flag is the cause. Answering `accessibilityTraits` `.none` turned that child into an
ordinary container (type 1) with the rows under it; answering `accessibilityValue` `nil` took the whole text off it
(26.3 runs `ui-26.3-86217` and `ui-26.3-6963`). So iOS's accessibility gives a view that adopts `UITextInput` the text
area trait and reads its value through the protocol; the content now answers no element, no trait and no value, which is
what the parent's plain `UIView` answered. The verifier's other route, a text input that is not a view, was not needed
and was not built. VoiceOver's "only the rows in view are spoken" (337) holds again: `probe:p3375` G0 reads the same row
elements as the parent on both runtimes. One reading differs by timing and is said, not graded: on 26.3 history row
53 (`[0,185,400,9.67]`, wholly above the grid's top at 200) is sometimes an element, a row the `spoken` range kept from
the window's last draw, which 337 takes "as the view stood when the window was last drawn". In the first instance's two
runs the parent exposed it and HEAD did not; in this instance's run both exposed it. It is seen by no one either way.

**F2, the held handle, and the one rule it makes.** The long press recogniser, its 0.45 s and `ScreenGestureRules` are
unchanged, so `ScreenScroller.swift` did not move (the verifier's first route, refusing the press near a handle, would
leave a rested finger with no magnifier until the handle drag began on its first movement). Instead a press that BEGINS within `reach` (22 pt) of either caret takes that end exactly as the handle
drag does: the magnifier at once, nothing moved until the finger moves, the menu at the lift. So whether a finger on a
handle drags the handle no longer depends on how long it rested. Stated: with a selection held, a long press within 22 pt
of either end (at the fitted 3.33 × 6.67 pt cell, about six columns and three rows) takes that handle rather than
selecting a new word; a tap clears the selection first. That is §13 item 1's rule, which already held for a quick touch,
now held for a slow one, as on iOS.

**Nits.** M15 is `testAHandleIsTakenAtItsOwnCaret`. NOT fixed, stated: M13 (`scrollback.selecting = true` when a
selection begins) and M14 (back to live clearing a selection over rows no longer held) are `Screen.swift`'s SwiftUI page
state, unchanged from the parent, which held them by nothing either; a test needs the page hosted, and the fix round kept
`Screen.swift` out of its edits for the merge. A start handle dropped on a wide rune's empty second column selects from
that column (the H1 observation, `文/x` for `中文/x`): the parent's text rule, not changed.

**The first instance's measurements, read from its logs** (scratch `.../scratchpad/p3375/fixer/`):

| What | Exit | Numbers |
| --- | --- | --- |
| The verifier's own UI drives in a clone (V0 dump, V1, V4, V5, V8b, V9b), 26.3 | 0 | 6 passed, 219.6 s, the device made and deleted |
| The verifier's hostile unit tests H1 to H10 in a clone, 26.3 and 18.3 | 0 | 11 of 11 passed on each (H10 included), with one change to the verifier's copy: each H1 press starts from no selection (F2's rule). The first runs failed H1 on that rule and H2 on a clone that lacked `build/fixtures/screen/` |
| `probe:p3375` whole beside the parent, 18:23 to 18:44 | 1 | N1 to N10 and G1 to G5 PASS on 26.3 and 18.3; G0 PASS on 18.3 and FAIL on 26.3 on the parent's row 53 above, which led to G0's "wholly outside the grid, said, not graded" clause, proved both ways in the self-test; then G0 alone on both runtimes, exit 0, PASS |
| `ablation:p316` whole, `test:ios` 26.3 | not finished | stopped with the instance |

**The battery, run again by the second instance in `/private/tmp/wt-p3375`** (scratch `.../fixer/r2/`; every command
with `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset and a scratch `ZDOTDIR`):

| Command | Exit | Numbers |
| --- | --- | --- |
| `df -h /` | 0 | 80 Gi free at 19:13, 85 Gi after this role's derived data went, 82 Gi during the runs |
| `git diff --stat 0b87d0af -- src/ docs/audits/contract-baseline.txt` | 0 | 0 lines; `CURRENT_PROJECT_VERSION = 11` in all six configurations |
| `npm run typecheck` | 0 | 3 s; import boundaries 1,429 files 0 violations; 0 runtime cycles over 1,426 files |
| `npm run build` | 0 | 42 s; gate:electron 176 against 176; gate:background 570 files, 3 long-lived starters each ended in a `finally`; gate:simulator 568 scripts, 5 users against 5; conformance:ios PASS, 51 rules over 54 app files, 75 test files and 143 files; gate:onlyadd PASS; conformance:harnessprobes 6 green, 16 red; contract-inventory byte for byte |
| `npm test` (scratch `HOME` and `ZDOTDIR`) | 0 | 57 s; 1,141 files passed and 2 skipped (1,143); 21,428 tests passed, 14 skipped (21,442) |
| `npm run conformance:ios` | 0 | 5.5 s, the same 51 rules |
| `npm run conformance:phonecopy` | 0 | 2.3 s, `phonecopy OK` |
| `npm run gate:simulator`, `gate:checks`, `gate:electron`, `gate:background` | 0, 0, 0, 0 | 0.6 s (5 against 5), 0.6 s (272 check scripts classified), 1.2 s (176 against 176), 1.6 s |
| `npm run ablation:p316` (whole) | 0 | 3,417 s (19:18:10 to 20:15:07, beside both `test:ios` runs and the probe); **598 of 598 arms red on the rule that owns them**, al14, al15 and al16 among them, every rule (a) to (z) and (aa) to (ba) proved able to fail, the clone removed, the working tree unmoved |
| `npm run test:ios` (26.3), slot `electron.lock`, released on the same line | 0 | 488 s; Debug 908 tests, 0 failures, 218.4 s; Release 905 tests, 0 failures, 83.0 s; the Debug app's 11 Mach-O files with all 5 DEBUG seams, the Release app's 12 and the device archive's 1 with none; device `p316-38948-1` shut down and deleted |
| `P316_RUNTIME=18.3 npm run test:ios`, slot `electron.lock2`, released on the same line | 0 | 386 s; Debug 908 tests, 0 failures, 108.5 s; Release 905 tests, 0 failures, 94.6 s; device `p316-41821-1` shut down and deleted |
| `node build/p3375/probe-p3375.mjs --grader-self-test` | 0 | 157 cases, every clause red on its own break and green on the honest reading; nothing booted |
| `node build/p3375/probe-p3375.mjs --preflight` | 0 | Xcode, both runtimes, the device type, the UI test and the sample present |
| `npm run probe:p3375` whole beside the parent (`git archive 0b87d0af ios`), `P3375_KEEP=1`, slot `electron.lock` 19:29:24 to 19:57:06, released on the same line | 2 | 1,662 s. **iOS 26.3: N1 to N10 and G0 to G5 all PASS.** **iOS 18.3: N1 to N3, N5 to N10 and G0 to G5 PASS; N4 UNREADABLE**: the app ended 4 s after its launch, at the pairing screen and before the arm's first gesture, inside the test framework (`EXC_BAD_ACCESS` in XCTAutomationSupport's `runtime_issue_os_log_fault_callback` under `__LIBTRACE_CLIENT_QUARANTINED_DUE_TO_HIGH_LOGGING_VOLUME__`, crash report `Tortie-2026-10-16-195148.ips` for `com.itavero.tortie.phone` on this run's device), the 18.3 log quarantine 337.1 recorded. RUN PASS: 0 of the run's devices left, 34 pasteboard reads, every one the handle's. N10's menu came by itself 7.3 s (26.3) and 9.8 s (18.3) after the lift; HEAD's drives 871 s and 346 s, the slow copy's 38 s and 36 s, the parent's 133 s and 121 s |
| `P3375_ARMS=N4 P3375_RUNTIMES=18.3 npm run probe:p3375`, slot `electron.lock` 19:58:32 to 20:00:11, released on the same line | 0 | 99 s; N4 PASS on 18.3 (a word of history row 59, its end handle into live row 2, the pasteboard the history rows then the live rows); RUN PASS |
| `xcrun simctl list devices \| grep -c p316-` | 0 | 1 after every run of this instance: the first instance's `p316-49303-1`, booted since 18:45, never touched |

**His shell history.** `~/.zsh_history` read `738871 1792183350` and `~/.bash_history` `23166 1790702242` at this
instance's start (19:13) and before and after every command above; nothing moved. (The brief's `737736 1792023873` was
out of date before this phase's builders started, as the spec step, the builders, the integrator and the verifier all
reported; the move to `738871 1792183350` happened during the integrator's ablation run, §As built above.)

**Housekeeping.** Derived data and clones this role made were deleted (the first instance's `ddB`, `ddH`, `ddW`,
`dd-ti263*` and the probe runs' `dd*`, about 2.4 GB, and this instance's own); the lines, acks and logs stay under
`.../fixer/` for the reverify. `xcrun simctl list devices | grep -c p316-` reads 1 at the end, the first instance's
`p316-49303-1`, booted, left for the main session.
