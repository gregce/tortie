# 35. The Tortie home screen, and cloning a repository

Specification for the full window state a user sees when no project is open, and for the
clone flow that state introduces. Written 2026-08-12. A later phase builds it, and that
phase is 18.6.

**This document contains no code changes.** Nothing under `src` was written. No package was
installed into the repository. Every measurement below was taken on the operator's Mac on
2026-08-12, against git version 2.50.1 (Apple Git-155) at `/usr/bin/git`, and against the
working tree at commit `c726627` plus the uncommitted Phase 18.5 edits.

Three agents researched this and a fourth attacked the result. Where the attack overturned
a finding, this document carries the corrected version and section 5 records what was cut
and why. A builder should read this document and section 5 together, because several of
the cuts look like omissions until you read the reason.

---

## 0. The answer in one page

The home screen becomes a single left aligned column, 460 px wide, centred in the window
and anchored near the top. It holds five things in this order.

1. The brand lockup, which is the Tortie mark at 48 px beside the wordmark `TORTIE.sh`.
2. The promise, as one sentence directly under the lockup.
3. Three action rows, which are Open, New and Clone.
4. A recent projects list of up to 5 rows.
5. One hint line about dropping a folder.

Cloning spawns the system `git` binary. Tortie does not adopt a git package for the clone.
That recommendation goes against the operator's stated default, so section 3.1 carries the
measurements that overturned it.

| Question | Decision | Deciding reason |
| --- | --- | --- |
| Action form | Three rows, not cards | Clone does not exist in the product yet, so it needs a sentence rather than a label. A card holds an icon and a label and no more. |
| Number of actions | Three | The brief forbids padding to four, and SSH is out of scope by the operator's instruction. |
| Wordmark | `TORTIE` in caps with `.sh` in lowercase, 28 px at weight 600 | `.sh` is a file extension and a domain, and both are only ever written in lowercase. Measured cap height is 20.07 px and the `h` ascender is 19.73 px, so the two halves align within 0.34 px. |
| Recent projects | Included, capped at 5 rows | It is navigation and not a dashboard. Closing your last project today deletes the row and the path is gone, which is the reconstruction the product exists to remove. |
| Status dots on recent rows | **Cut** | A number that rises on its own, on a screen where the user cannot act on it. The menu bar tray already lists every live session and is complete where the list would be partial. |
| Recents storage | A plain JSON file at `<userData>/recents.json`, owned by main | It is disposable convenience data. Putting it in the manifest puts it in the database that holds session restore state. |
| The promise | Directly under the lockup at 15 px | That is the slot a reader uses to learn what a thing is. The reference screen fills it with a version number. |
| Clone progress | The phase in plain words, and a bar that shows that phase's own percentage and resets when the phase changes | Git prints a percentage per phase and never an overall one. A single monotonic bar is a number nothing produced. |
| Byte totals | **Cut** | Git prints a cumulative byte figure and never a denominator, so "12.4 MB of 48.1 MB" could never render. |
| Clone package | Spawn the system git. Build the parser | `simple-git` collapses two git phases into one stage named `remote:` and delivers 21 frames where git emitted 207. Every other candidate fails on credentials, on speed or on its API. |
| Clone options in the dialog | None. No depth, no submodules, no partial clone | Those are git command furniture, and the scope guardrail rejects a control that exists because another tool has it. |
| Clone keyboard shortcut | None | Every built in chord leaves the pool the user may record for per agent hotkeys. That is a bad trade for a weekly action. |

### 0.1 What the adversary review changed

Eight things changed after the review, and every one of them makes the build smaller or
more honest.

| Changed | From | To |
| --- | --- | --- |
| Recent row status dot, count badge and pulse | Specified | Cut entirely |
| Recents storage | A SQLite migration and a new manifest table | A JSON file in userData |
| Clone progress bar | One monotonic bar weighted 15 / 70 / 15 across phases | One bar per phase, showing that phase's own number |
| Byte line | `12.4 MB of 48.1 MB` | Git's own cumulative figure with git's own unit, or nothing |
| First phase word | `Connecting to github.com...` held across four phases | `Preparing on the server`, then the phase word changes as git's phase changes |
| Failure list | Five rows, with no row for the commonest private repository failure | Ten rows, with the credential failure split from the not found failure |
| Cancel copy | Hardcoded in the renderer | Reported by main, because only main knows whether the cleanup worked |
| Spawn options | `detached: true` and a process group kill | A plain child and a direct SIGTERM, plus a cancel on `before-quit` |

### 0.2 The one thing the operator must decide before this ships

`tortie.sh` is registered and pointed at Vercel. Checked today, the domain resolves to
`216.150.1.193` and `216.150.16.193` on `ns1.vercel-dns.com`. The HTTPS handshake fails
because no certificate is served, and plain HTTP returns 404. Printing `TORTIE.sh` in the
application window advertises an address that serves nothing. Section 7 states the two
positions and the recommendation.

---

## 1. The design

### 1.1 The shape

```
   the window, with no project open

   +--------------------------------------------------+
   |  titlebar, unchanged                             |
   +--------------------------------------------------+
   |                                                  |
   |            +------------------------+            |
   |            |  lockup                |            |
   |            |  promise               |            |
   |            |                        |            |
   |            |  action row            |            |
   |            |  action row            |            |
   |            |  action row            |            |
   |            |                        |            |
   |            |  RECENT                |            |
   |            |  recent row            |            |
   |            |  ...                   |            |
   |            |                        |            |
   |            |  hint                  |            |
   |            +------------------------+            |
   |             <----- 460 px ----->                 |
   |                                                  |
   +--------------------------------------------------+

   the column is centred horizontally and anchored to the top,
   and its contents are left aligned inside it
```

The column is top anchored and never vertically centred. A centred column moves the mark up
and down depending on whether the user has recents. The mark must sit at the same height on
the first launch and on the hundredth.

The contents are left aligned inside a centred column. The screen contains a list, lists are
read from the left, and a centred list gives the eye no stable left edge to return to. This
breaks the centred family that DESIGN-SPEC S9 describes for the other empty states, and the
break is deliberate. The consequence is that the home screen and the no sessions state at
DESIGN.md section 6.2 no longer share an alignment. That is acceptable because the no
sessions state sits inside a project with chrome around it and this screen has no chrome at
all. If a later round wants one family again, the fix is to left align both rather than to
centre this one.

### 1.2 Wide window, 1440 by 900, a user with recents

```
+--------------------------------------------------------------------------------+
| (o)(o)(o)      +                                                          [bell]|  38 px titlebar
+--------------------------------------------------------------------------------+
|                                                                                |
|                                                                                |  126 px
|                                                                                |
|                  +------+                                                      |
|                  | mark |  TORTIE.sh                                           |  48
|                  +------+                                                      |
|                                                                                |  12
|                  Sessions you start keep running even when Tortie is closed.   |  22
|                                                                                |  32
|                  +----------------------------------------------------------+ |
|                  | [=]  Open project...                               [ #O ] | |  48
|                  |      Any folder works. A git repository gets the full     | |
|                  |      sidebar.                                             | |
|                  +----------------------------------------------------------+ |
|                    [+]  New project...                             [ ^#N ]    |  48
|                         Create an empty folder and start a git repository     |
|                         in it.                                                |
|                    [Y]  Clone repository...                                   |  48
|                         Download a git repository and open it as a project.   |
|                                                                                |  32
|                  RECENT                                                       |  16 + 6
|                    gmux                                                    ~   |  28
|                    specstory-sync                                    ~/code    |  28
|                    getspecstory                                      ~/code    |  28
|                    tortie-brand-assets                     ~/Documents/work    |  28
|                    old-experiment                            -~/tmp-      (!)  |  28
|                                                                                |  20
|                  Drop a folder anywhere in this window to open it.            |  18
|                                                                                |
+--------------------------------------------------------------------------------+
   <---------------------------- 460 px column ---------------------------->

   [ #O ]  keycap chip, rendered by the shared Keycap component
   -text-  struck through, meaning the folder is gone
   (!)     codicon warning, in the reserved 16 px slot at the right of the row
   the first action row carries the focus ring on arrival
```

### 1.3 Narrow window, 960 by 600, which is the minimum size

```
+----------------------------------------------------------+
| (o)(o)(o)   +                                      [bell] |  38
+----------------------------------------------------------+
|                                                          |  84
|          +------+                                        |
|          | mark |  TORTIE.sh                             |  48
|          +------+                                        |
|          Sessions you start keep running even when       |  22
|          Tortie is closed.                               |
|                                                          |  32
|          +---------------------------------------------+ |
|          | [=]  Open project...                 [ #O ] | |  48
|          |      Any folder works. A git repository     | |
|          |      gets the full sidebar.                 | |
|          +---------------------------------------------+ |
|            [+]  New project...             [ ^#N ]       |  48
|                 Create an empty folder and start a git   |
|                 repository in it.                        |
|            [Y]  Clone repository...                      |  48
|                 Download a git repository and open it    |
|                 as a project.                            |
|                                                          |  32
|          RECENT                                          |  22
|            gmux                                      ~   |  28
|            specstory-sync                       ~/code   |  28
|            getspecstory                         ~/code   |  28
|                                                          |  20
|          Drop a folder anywhere in this window to open   |  18
|          it.                                             |
|                                                          |  44 spare
+----------------------------------------------------------+
```

Nothing is removed on a narrow window except the last two recent rows. The column keeps its
460 px width down to 960 px of window width, where the side margins are 250 px each. The
promise sets on one line at 460 px, measured at 394 px of text.

### 1.4 First ever launch, with no recents

```
+--------------------------------------------------------------------------------+
| (o)(o)(o)      +                                                          [bell]|
+--------------------------------------------------------------------------------+
|                                                                                |
|                                                                                |  126 px, identical to 1.2
|                                                                                |
|                  +------+                                                      |
|                  | mark |  TORTIE.sh                                           |  same y as 1.2
|                  +------+                                                      |
|                                                                                |
|                  Sessions you start keep running even when Tortie is closed.   |
|                                                                                |
|                  +----------------------------------------------------------+ |
|                  | [=]  Open project...                               [ #O ] | |
|                  |      Any folder works. A git repository gets the full     | |
|                  |      sidebar.                                             | |
|                  +----------------------------------------------------------+ |
|                    [+]  New project...                             [ ^#N ]    |
|                         Create an empty folder and start a git repository     |
|                         in it.                                                |
|                    [Y]  Clone repository...                                   |
|                         Download a git repository and open it as a project.   |
|                                                                                |
|                  Drop a folder anywhere in this window to open it.            |
|                                                                                |
|                                                                                |
+--------------------------------------------------------------------------------+
```

The recents block is absent. There is no header, no placeholder row and no reserved box. An
empty labelled section is a structure that describes nothing. Because the column is top
anchored, removing the block moves nothing above it, so the mark and the actions sit at the
same y in both states.

### 1.5 Measured geometry

Every number was measured in the prototype named in section 9.

| Part | Height | Margin above | Token for the margin |
| --- | --- | --- | --- |
| Lockup | 48 | 0 | |
| Promise | 22 | 12 | `--space-5` |
| Actions block, 3 rows at 48 px | 144 | 32 | `--space-9` |
| Recents block, a 16 px label plus 6 px plus 5 rows at 28 px | 162 | 32 | `--space-9` |
| Hint | 18 | 20 | `--space-7` |

| Case | Column content height |
| --- | --- |
| 5 recents | 490 px |
| 3 recents | 434 px |
| No recents | 296 px |

The column box is 460 px wide with `flex: 0 0 auto`, horizontally centred by its scroll
container, with top padding `clamp(28px, 14vh, 140px)` and bottom padding `--space-9`. The
container is `overflow-y: auto`, so a window shorter than the content scrolls rather than
clipping.

The recents cap is a CSS rule and not a JavaScript branch.

```css
@media (max-height: 760px) {
  .home-recents .home-recent:nth-of-type(n + 4) { display: none; }
}
```

Use `nth-of-type` and not `nth-child`. The section label is the first child, so
`nth-child(n+4)` hides one row too many. That was caught in the prototype.

The cap of 3 was measured rather than guessed. Five rows plus the rest of the column is
490 px of content, which does not fit the 562 px content area of the 960 by 600 minimum
window once the padding is usable. Three rows is 434 px and fits with 44 px to spare.

### 1.6 The wordmark

```
   +--------+
   |        |   TORTIE.sh
   |  mark  |
   |        |
   +--------+
   <- 48 ->  <16>  <- 143 ->

   total lockup width 207 px, measured
```

| Element | Value | Token |
| --- | --- | --- |
| Mark | 48 by 48 px, full opacity, no badge and no chrome | `src/renderer/assets/brand/tortie-128.png` |
| Gap between mark and wordmark | 16 px | `--space-6` |
| Wordmark family | the UI sans | `--font-ui` |
| Wordmark size and line height | 28 px on 32 px | new tokens `--text-brand` and `--lh-brand` |
| `TORTIE` weight | 600 | `--weight-semibold` |
| `TORTIE` tracking | 0.06em, which is 1.68 px at this size | literal, with the reason beside it |
| `TORTIE` colour | `#e8eaed` at 15.28:1 | `--text-primary` |
| `.sh` weight | 400 | `--weight-regular` |
| `.sh` tracking | 0.02em | literal |
| `.sh` colour | `#a8adb8` at 8.19:1 | `--text-secondary` |
| Alignment | the vertical centre of the mark to the vertical centre of the cap band | |
| Animation | none, ever | DESIGN.md section 5 forbids anything on app load |

The mark is 2.39 times the cap height, which sits inside the normal range of about 1.5 to
2.5 for a mark set beside a wordmark.

**Why the suffix is set differently.** There are three reasons and each one is load bearing.

1. `.sh` is a literal string. It is a shell script extension and it is a domain. Both are
   only ever written in lowercase. Setting it as `.SH` removes the only meaning the suffix
   carries.
2. The name is `Tortie` and the suffix is its address, so the eye should land on the name
   first. A lighter weight and a step down the neutral ramp do that without changing size.
3. The size stays the same because a smaller suffix would hang off the end like a trademark
   mark. At the same size the ascender of the `h` lands on the cap line, which locks the two
   halves into one object. Cap height measures 20.07 px and the `h` ascender measures
   19.73 px.

**Alternatives, all rendered at 1x on `--bg-canvas` and compared.**

| Option | Verdict | Deciding reason |
| --- | --- | --- |
| `TORTIE` caps with `.sh` lowercase, tracking 0.06em | Chosen | It reads as a set wordmark and the suffix keeps its meaning. |
| `TORTIE.SH`, all caps | Rejected | It reads as an acronym, and the suffix stops looking like an extension or a domain. |
| `Tortie.sh`, sentence case | Rejected | It is correct as a proper noun and it has no presence. On screen it reads as a heading. |
| `TORTIE` alone, no suffix | Held open | It is the safe position while `tortie.sh` serves nothing. See section 7. |
| Tracking 0 | Rejected | It reads as a bold heading rather than a wordmark. |
| Tracking 0.12em | Rejected | The wordmark grows to about 175 px and the letters come apart. |
| Mark at 40 px | Rejected | It is under scaled against 20 px caps. |
| Mark at 56 px | Rejected | It is over scaled and the mark starts to outrank the name. |

A new type token is needed because `--text-lg` at 20 px is the largest size in the scale,
and 20 px is not a wordmark. The step from 20 to 28 is 1.4, which sits outside the scale's
1.18 ratio on purpose. This is a mark and not a level in the text hierarchy, and it has
exactly one user in the whole application.

**Markup.** The wordmark is the only `<h1>` in the application. Every other full window state
uses `<h2>`, because those states label a region and this one names the product. The two
spans are hidden from assistive technology and the heading carries `aria-label="Tortie.sh"`,
so a screen reader announces the name once rather than reading `TORTIE` and `.sh` as two
runs. The mark image stays `alt=""` and `aria-hidden`, because the heading beside it already
names the product.

### 1.7 The mark, and the contrast measurement

The measurement is real and its severity was overstated in the first draft. Both halves of
that sentence matter, so here is the measurement first.

| Measurement | Value |
| --- | --- |
| Opaque pixels in `src/renderer/assets/brand/tortie-128.png` | 5,146 |
| Pixels clearing 3:1 against `--bg-canvas` `#131417` | 732, which is 14.2 percent |
| Dominant body colour of the cat | `#212a2b`, which measures 1.25:1 |
| Brightest pixel, in the shell | `#7ccbff`, which measures 10.39:1 |

**This is not a conformance failure.** WCAG 1.4.11 exempts a logotype from the 3:1 floor for
non text content, and the wordmark beside the mark carries the name as real text. The mark
is also an outline drawing rather than a filled shape. Its outline and its shell are the
parts that carry the form, and those measure 10.39:1. The 85.8 percent figure counts the
interior of an outline, which is the part that is meant to sit close to the background.

**It is still a legibility observation.** In the wide screenshot at 48 px the mark reads as
dim rather than as absent. A reader sees a small dark cat with a blue patch, and the blue is
doing most of the work. That is a brand judgement rather than an accessibility gate.

| Option | Result | Verdict |
| --- | --- | --- |
| Ship the existing mark at 48 px | The outline reads. The body is dim. | Chosen for Phase 18.6. |
| A new dark ground variant, `tortie-onDark-128.png` | Every opaque pixel clears 3:1, with the body moving from `#212a2b` to about `#646667`. | Recommended as brand work, and not a gate on this phase. |
| `filter: brightness(2.6)` on the existing PNG | The body reaches 3.35:1. | Rejected. The shell's highlight clips to pure white above a factor of 2.2, so the mark loses its blue. |
| Tint the menu bar template to `--text-primary` | Every pixel clears 12:1. | Rejected. The mark becomes a flat white cat with no shell colour, and the largest template asset is 36 px. |
| Make the mark larger and change nothing else | No improvement worth having. | Rejected. Size helps shape recognition and does not change luminance contrast. |

A mechanical proof of the second option exists in the scratchpad. Every pixel below the
threshold was blended toward white in linear light until it reached 3.2:1. That file is a
proof and not a shipping asset, because it desaturates the body from a cool near black to a
neutral grey. If the brand tool regenerates the variant it should keep the cool hue of the
ramp. The requirement for whoever makes it is one line. **Every opaque pixel must measure at
least 3:1 against `#131417`.**

### 1.8 The action rows

| Form | Verdict | Deciding reason |
| --- | --- | --- |
| Three rows with an icon, a title and a subtitle | Chosen | Clone does not exist in the product, so it needs a sentence and not a label. The rows share one interaction vocabulary with the recents list below, so one set of arrow keys walks the whole screen. |
| Three cards in a row | Rejected | A card holds an icon and a label and no more. It also forces the question of which card is primary, and the only way to mark a primary card is an accent fill. DESIGN.md section 1.2 forbids accent on an icon at rest. |
| Two buttons and one link | Rejected | Hiding clone behind a link defeats the point of adding it. |
| Four cards, matching the reference | Rejected | The brief forbids padding to four, and SSH is out of scope. |

Order is the hierarchy. Open is first because it is the common case. There is no accent
fill, no coloured icon and no visual primary. The order and the initial keyboard focus carry
the rank.

```
  <-8-> <--20--> <-12-> <---------- flexible ----------> <-12-> <-chip-> <-8->
 +---------------------------------------------------------------------------+
 |      [icon]         Open project...                          [ #O ]       |  48 px
 |                     Any folder works. A git repository gets the...        |
 +---------------------------------------------------------------------------+
```

| Part | Spec |
| --- | --- |
| Row | 48 px tall, radius `--r-md`, horizontal padding `--space-4`, full column width |
| Icon | a codicon at 18 px in a 20 px slot, `--text-secondary`, drawn with `currentColor` |
| Title | 13 px on 20 px, `--weight-medium`, `--text-primary` |
| Subtitle | 12 px on 18 px, `--weight-regular`, `--text-muted` |
| Keycap | the shared `Keycap` component from `src/renderer/keys/`, right aligned |
| Hover | fill `--bg-raised`, and the subtitle steps up to `--text-secondary` |
| Focus visible | `--focus-ring`, with no fill change |
| Active | fill `--bg-active` |

The hover rule is not cosmetic. `--text-muted` on `--bg-raised` measures 4.38:1, which is
below the 4.5:1 floor. DESIGN.md section 1.1 already states that secondary information steps
up to `--text-secondary` on a raised fill, and `--text-secondary` on `--bg-raised` measures
6.83:1. A builder who applies only the fill ships a contrast failure on every hover.

| Action | Codicon | Reason |
| --- | --- | --- |
| Open project | `folder-opened` | It is the glyph the Explorer already uses for an open folder. |
| New project | `new-folder` | It is the glyph the tree already uses for the create verb. |
| Clone repository | `repo-clone` | It is codicons' own name for this verb, so nothing is invented. |

**The same three verbs go in the same order everywhere.** `src/renderer/app/project-menu.ts`
is the one place the way in is spelled, and it gains a third item. Both surfaces it feeds get
all three, which are the `+` button at the end of the tab strip and the native File menu.

```
  Open Project...      #O
  New Project...      ^#N
  Clone Repository...
```

Native menu labels stay in Title Case, matching every other native menu. The home screen
rows stay in sentence case, per DESIGN.md section 7. The existing guard in that module stays
as it is, so a missing bridge method hides the item rather than offering something broken.

### 1.9 Recent projects

**The argument, both ways.** The Zen names three refusals under "Not a dashboard", which are
counters, activity feeds and progress theatre. A list of places you have been is the most
dashboard shaped thing that could go on this screen, so it deserves the test. It fails none
of the three. It has no number that rises on its own, it is not a feed and it shows no
progress. It is navigation. The Zen's own words are that the product succeeds when the
developer can look away without anxiety and come back without reconstruction. Today, closing
your last project deletes the manifest row and the path is gone, so coming back means finding
the folder in Finder again. That is reconstruction.

It also passes the zero new concepts test. `File > Open Recent` is a menu every macOS
application has and Tortie does not. Building the list makes Tortie more conventional rather
than less.

```
  <-8-> <--20--> <-12-> <-------- name --------> ......... <path> <-16->
 +-------------------------------------------------------------------------------+
 |                     gmux                                             ~     [ ] |  28 px
 +-------------------------------------------------------------------------------+
```

| Part | Spec |
| --- | --- |
| Row | 28 px tall, radius `--r-sm`, horizontal padding `--space-4` |
| Left indent | 32 px of padding before the name, so it aligns with the action row titles |
| Name | 13 px on 20 px, `--text-primary`, truncated with an ellipsis at the end |
| Parent path | `--font-mono` at 11 px, `--text-muted`, right aligned, written relative to home, middle truncated by the existing `truncateMiddle` helper |
| Warning slot | 16 px, reserved on every row, empty unless the folder is missing |
| Hover | fill `--bg-raised`, and the path steps up to `--text-secondary` |

The path is set in mono because DESIGN.md section 1.8 reserves mono for terminal adjacent
truth and names paths shown as paths as one of its cases.

| Field | Shown | Reason |
| --- | --- | --- |
| Project name | Yes | It is the thing being chosen. |
| Parent folder, relative to home | Yes | Two projects can share a name. The parent is what tells them apart. |
| Session status dot | **No** | Cut. See section 5.1. |
| Needs input count badge | **No** | Cut. See section 5.1. |
| Last opened time | No | The list is already sorted by it, so printing it adds nothing the order does not say. |
| Session count | No | A bare count is not a signal, and the Zen forbids counters. |
| Branch name | No | It needs a git read per row on a screen the user is leaving. |
| Repository size or language | No | It is decoration. |

**A recent whose folder has moved or been deleted.**

```
                 old-experiment                          -~/tmp-              (!)
                 ^ --text-muted                          ^ struck through     ^ codicon
                                                                                warning
```

| Part | Treatment |
| --- | --- |
| Name | steps down from `--text-primary` to `--text-muted`, which is still 5.25:1 |
| Path | struck through, with the colour unchanged |
| Warning slot | codicon `warning` at 12 px in `--text-muted` |
| Tooltip and `aria-label` | Tortie cannot find this folder. |
| Click | opens the folder picker seeded at the last known parent, so the user can point at where it went |
| Context menu | Reveal in Finder is removed. Remove from Recent stays. |

Three redundant channels carry the state, which are the colour, the line through the path
and the icon. That satisfies the rule that no state is ever carried by colour alone.

The existence check runs after the first paint and never before it, so the screen does not
wait on the filesystem. It only ever adds the treatment, and because the warning slot is
reserved on every row the addition causes no reflow.

Hiding a missing row was rejected, because a row that disappears without explanation makes
the user doubt their own memory. Failing on click with a toast was also rejected, because
the row can say so before it is clicked.

**Row context menu.** Native, through the `ui:popupMenu` bridge. Tortie never draws a menu in
the DOM.

```
  Open
  Reveal in Finder
  Copy Path
  ---
  Remove from Recent
```

**There is no "View all" control on screen.** The full list is `File > Open Recent`. A second
list surface is new UI for a rare need, the native menu is where macOS users already look,
and it works from inside a project as well.

### 1.10 The promise

The sentence stays, word for word.

> Sessions you start keep running even when Tortie is closed.

It moves from the middle of a paragraph to the line directly under the lockup. That is the
slot a reader uses to find out what a thing is, and it is the slot the reference screen fills
with a version number. Putting the promise there is the whole difference between the two
screens.

| Property | Value |
| --- | --- |
| Size | 15 px on 22 px, `--text-md` |
| Weight | 400 |
| Colour | `--text-secondary` at 8.19:1 |
| Width | the full 460 px column. It sets on one line, measured at 394 px |
| Margin above | 12 px, `--space-5` |

It is set in `--text-secondary` rather than `--text-primary` on purpose. The action titles
are `--text-primary` and they are what the user has to click. A sentence that outranks the
buttons, on a screen whose job is to get you into a project, is the wrong order. At 15 px it
is already larger than everything except the wordmark, so its size carries its rank without
borrowing the colour.

The second half of the old body copy, which said that a project is any folder and that a git
repository gets the full sidebar, moves to the subtitle of the Open row. That is where it is
needed, next to the thing it describes.

### 1.11 Every string

Sentence case throughout. Buttons are verbs. No exclamation marks.

| Slot | String |
| --- | --- |
| Wordmark | `TORTIE` plus `.sh`, with `aria-label="Tortie.sh"` |
| Promise | Sessions you start keep running even when Tortie is closed. |
| Action 1 title | Open project... |
| Action 1 subtitle | Any folder works. A git repository gets the full sidebar. |
| Action 2 title | New project... |
| Action 2 subtitle | Create an empty folder and start a git repository in it. |
| Action 3 title | Clone repository... |
| Action 3 subtitle | Download a git repository and open it as a project. |
| Section label | RECENT, set in the 11 px uppercase section style |
| Missing folder tooltip | Tortie cannot find this folder. |
| Hint | Drop a folder anywhere in this window to open it. |
| Row context menu | Open / Reveal in Finder / Copy Path / Remove from Recent |
| Group label for assistive technology | Ways to open a project |
| Recents group label for assistive technology | Recent projects |

The Open row keeps the word "project" rather than switching to "folder". Project is the
product's word, it matches the File menu item, and it matches the label on the `#O`
accelerator. Inventing a second word for one verb on one screen is the drift the growth
guardrails warn about. The subtitle carries the fact that any folder works. Note that the
prototype screenshot says "Open a folder..." because it was rendered before this table was
settled. The table is the specification and the screenshot is stale on this string.

### 1.12 Tokens, contrast and motion

Two new tokens, and they have one user between them.

```css
--text-brand: 28px;
--lh-brand: 32px;
```

They go in `src/renderer/styles/tokens.css` beside the type scale, with a comment saying they
are the wordmark's size and that the wordmark is their only user.

Everything else uses existing tokens. There is no new colour, no new spacing value, no new
radius and no new duration. Two literals are needed and neither is a colour. They are the two
letter spacing values in the wordmark, which are `0.06em` and `0.02em`. The design system has
no tracking tokens, and adding two for one element would be worse than the literals. They sit
in the brand CSS with the reason written next to them.

| Pair | Ratio | Floor | Pass |
| --- | --- | --- | --- |
| `--text-primary` on `--bg-canvas` | 15.28:1 | 4.5 | yes |
| `--text-secondary` on `--bg-canvas` | 8.19:1 | 4.5 | yes |
| `--text-muted` on `--bg-canvas` | 5.25:1 | 4.5 | yes |
| `--text-muted` on `--bg-raised` | 4.38:1 | 4.5 | **no, fixed by the hover rule in 1.8** |
| `--text-secondary` on `--bg-raised` | 6.83:1 | 4.5 | yes |
| Focus ring accent on `--bg-canvas` | 6.41:1 | 3 | yes |
| Mark outline and shell on `--bg-canvas` | 10.39:1 | 3 | yes |
| Mark body on `--bg-canvas` | 1.25:1 | 3 | exempt as a logotype, see 1.7 |

**There is no motion on this screen at all.** DESIGN.md section 5 says nothing animates on
app load, and cutting the status dot removes the one thing that could have pulsed. Hover and
focus use `--dur-fast` at 120 ms, which is the application's existing transition for a hover
fill.

### 1.13 Keyboard, drag and drop, and the titlebar

| Key | Behaviour |
| --- | --- |
| On arrival | Focus is on the first action row, which is Open project |
| Up and Down | Move through all rows as one list, three actions and then the recents. No wrapping, which is the macOS list convention. |
| Enter or Space | Activate the focused row |
| Tab | Leave the list, per roving tabindex. The list holds one tab stop. |
| `#O` | Open project, which is already a global shortcut |
| `^#N` | New project, which is already a global shortcut |
| Esc | No effect. There is nothing above this screen to close. |

The rows are buttons inside a labelled group with a roving tabindex, and not a `listbox`.
Each row performs an action rather than selecting a value, so a button is the honest role.
Arrow key handling is written by hand, which is what DESIGN.md section 4 already asks of
every list.

Focus lands on the first action row on every arrival. Focusing the most recent project was
considered, because pressing Enter on launch would reopen your last project and that is a
convenience. It was rejected because the same keystroke would then do one thing on a first
launch and a different thing on the next, and a default action that depends on history is
not predictable.

Clone gets no chord, for the reason in section 0. It lives in three places already, which are
the home row, the `+` menu and the File menu.

**Folder drop is unchanged in behaviour.** The whole window drop frame from
`src/renderer/terminal/drop/` still arms when a folder is dragged over the window with no
project open, still draws the 2 px dashed accent inset from DESIGN-SPEC S9, and still opens
the folder as a project. One thing changes, which is the sentence that advertises it. Today
the hint reads "Press #O, or drop a folder anywhere in this window." Both shortcuts now print
on their own rows, so the first half is redundant.

**The titlebar does not change.** It still renders with no project open and it still holds the
traffic lights, the `+` button and the attention button. The `+` menu gains the Clone
Repository item.

### 1.14 One alignment detail that matters

The recents rows carry 32 px of left padding before the name, so the name starts at the same
x as the title in an action row, which is 40 px from the column's left edge. Without this the
two lists have two different left edges 16 px apart, which is visible and reads as a mistake.
The first draft achieved this with a reserved 20 px dot slot. The dot is now cut, so the
alignment is padding.

---

## 2. Every state the screen has

| State | Trigger | Treatment |
| --- | --- | --- |
| First ever launch | No recents and no projects | Section 1.4. The recents block is absent and nothing above it moves. |
| Returning, last project closed | Recents exist | Section 1.2. Rows are sorted most recent first. |
| A recent has moved or been deleted | The existence check fails after the first paint | Section 1.9. Three channels carry it and no reflow happens. |
| Window shorter than 760 px | Any | The recents cap drops from 5 to 3 by CSS. |
| Window shorter than the content | Any | The column scrolls. It never clips and it never shrinks the type. |
| A folder is being dragged over the window | Drag enter | The existing whole window drop frame, unchanged. |
| An open fails | Any | The existing toast path, unchanged. |
| tmux is missing | Boot block | Unchanged. `TmuxMissing` replaces the whole window before this screen is ever reached. |
| Clone dialog, editable | The Clone row is activated | Section 3.13. |
| Clone dialog, checking the address | The Repository field loses focus, or the user submits | One quiet line under the field. The dialog stays fully editable. |
| Clone dialog, running | Preflight passed and git was spawned | Section 3.10. The fields become static text and a bar appears. |
| Clone dialog, cancelling | Cancel was pressed | The button reads `Stopping...` and nothing else changes. |
| Clone dialog, cancelled | The process exited after the cancel | The dialog returns to editable with every field intact, and one line above the actions reports what happened on disk. |
| Clone dialog, failed | git exited non zero, or preflight failed | Section 3.12. The dialog returns to editable, the Repository field takes focus with its contents selected, and the message sits where the New Project dialog already puts its error. |
| Clone succeeded | git exited 0 and the rename completed | The dialog closes and the new project opens as a focused tab. There is no success toast, because the tab appearing is the confirmation. |

**There is no loading state on the home screen itself.** The screen has nothing to wait for.
The recents come from a local JSON file and render on the first paint, and the only thing
that needs I/O is the folder existence check, which only ever adds to a row that is already
on screen.

---

## 3. The clone specification

A builder should be able to implement this section without further research. Where something
was not verified it says so, in section 3.16.

### 3.1 The package survey

Nine packages were surveyed. Download counts are the npm last week point figure fetched on
2026-08-12. The five capabilities are progress reporting, cancellation, credentials that do
not hang, shallow clone and submodules.

| Package | Version | Licence | Last release | Weekly downloads | Native code | Progress | Cancel | Credentials | Shallow | Submodules | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `simple-git` | 3.36.0 | MIT | 2026-04-12 | 12,152,319 | No | Broken, see below | Yes, `AbortSignal` | Not handled, we supply all four switches | Yes | Yes | Rejected |
| `isomorphic-git` | 1.41.3 | MIT | 2026-08-10 | 1,712,612 | No | Best of any candidate | Yes | Cannot use the keychain at all | Yes | No | Rejected |
| `dugite` | 3.2.3 | MIT | 2026-08-11 | 24,382 | Downloads a 62,348,987 byte git tarball on install | Raw stderr | Yes | Yes, it is real git | Yes | Yes | Rejected on packaging |
| `@napi-rs/simple-git` | 1.1.0 | MIT | 2026-07-07 | 334,444 | Yes, one `.node` per platform | Only on the synchronous call | Yes on the async call | libgit2 has no credential helper | Yes | Yes | Rejected on its API |
| `nodegit` | 0.27.0 stable | MIT | 0.28.0-alpha.38 on 2026-04-23 | 24,742 | Yes, builds or downloads libgit2 | Yes | Yes | Same libgit2 problem | Yes | Yes | Rejected |
| `degit` | 3.6.6 | MIT | 2026-08-02 | 1,030,961 | No | No | No | Not applicable | Not applicable | No | Rejected on purpose |
| `git-clone` | 0.2.0 | ISC | 2021-09-28 | 110,031 | No | No | No | No | Yes | No | Rejected, unmaintained for four years |
| `tinygit` | 0.0.8 | ISC | 2022-05-21 | 2 | Yes, through `keytar` | No | No | No | No | No | Rejected, abandoned |
| `hosted-git-info` | 10.1.1 | ISC | Current | 97,616,608 | No | Not applicable, it parses URLs only | | | | | Not adopted, see 3.4 |

**`simple-git` is the obvious choice and its progress parser is broken for this purpose.**
Two lines in `node_modules/simple-git/dist/cjs/index.js` decide it.

```js
function progressEventStage(input) {
  return String(input.toLowerCase().split(" ", 1)) || "unknown";
}

context.spawned.stderr?.on("data", (chunk) => {
  const message = /^([\s\S]+?):\s*(\d+)% \((\d+)\/(\d+)\)/.exec(chunk.toString("utf8"));
  if (!message) return;
  progress({ /* ... */ });
});
```

The first function keeps the first word of the label, and the first word of
`remote: Counting objects` is `remote:`. So counting and compressing both arrive as a stage
literally named `remote:`. On a depth 1 clone of `microsoft/TypeScript` that stage's `total`
changed from 75,447 to 56,014 partway through, because two different counts were reported
under one label. A bar driven by that number jumps backwards.

The second one is worse than it looks. The regex is anchored with `^` and carries no `m`
flag, so it can only match a stdio chunk that happens to begin exactly on a frame boundary.
Git emitted 207 frames across counting and compressing, and 21 arrived.

`simple-git` does have a good abort path. Aborting a full clone of `microsoft/TypeScript`
after 6 s rejected cleanly, removed the destination, and left no `git-remote-https` or
`index-pack` process running.

**`isomorphic-git` is disqualified by credentials.** It speaks HTTP itself and never runs
`git`, so `credential.helper` is never consulted and `git-credential-osxkeychain` never runs.
Tortie would have to obtain a token, hold it and pass it through `onAuth`. Tortie stores no
credential today, and this one package choice would change that. It is also 2.9 times slower,
at 2352 ms against 798 ms for the same full clone of `expressjs/express`. Resident memory grew
by 287 MB while cloning a 13 MB repository. It has no submodule API of any kind.

**`dugite` is disqualified by packaging.** Its `postinstall` downloads a platform tarball, and
for macOS on arm64 that tarball is 62,348,987 bytes. The git installation on this machine has
172 entries in `libexec/git-core`. Every Mach-O among them becomes a nested signing target for
`build/sign-nested-binaries.cjs`, which exists today to harden exactly one nested binary. The
fair counter is that Tortie already ships `@vscode/ripgrep`, which also downloads a binary at
install time, so the pipeline can do this. The objection is not that it is impossible. The
objection is that ripgrep buys a capability macOS does not provide, and a bundled git buys a
version pin on a program that is already at `/usr/bin/git` on every Mac with the Xcode command
line tools.

**`@napi-rs/simple-git` is disqualified by its API, before the native code question is
reached.** From its shipped `index.d.ts`, `RepoBuilder.clone(url, path)` is synchronous, which
in the Electron main process would block the event loop for the length of the clone. That was
101 s on `microsoft/TypeScript`. `Repository.cloneAsync` takes an `AbortSignal`, and the
typings state directly that the async variants must not carry `RemoteCallbacks`, which is
where `transferProgress` lives. So the async clone has no progress and the clone with progress
freezes the window.

**What other TypeScript desktop applications do.** VS Code spawns the system git and uses no
git library, in `extensions/git/src/git.ts`. GitHub Desktop uses `dugite` and ships a complete
git distribution inside the application. Eclipse Theia uses `dugite` through `dugite-extra`.
The VS Code forks inherit VS Code's spawn path unchanged. So the two live patterns are spawn
the system git and ship your own git, and nobody in this group uses a JavaScript git library
for cloning. That is corroboration and not proof, and it comes from package manifests and
source rather than from running those applications.

### 3.2 The verdict

**BUILD.** Tortie clones by spawning the system `git` binary from a new module beside the
runner it already owns, because every surveyed package either parses git's progress wrongly,
cannot reach the macOS keychain, or has an API that forces a choice between progress and a
responsive window.

Two smaller verdicts follow from it.

| Job | Verdict | Reason |
| --- | --- | --- |
| The clone itself | BUILD | The table above. |
| URL normalisation | BUILD | The eleven rules in 3.4 are the whole job. `hosted-git-info` returns null for a self hosted host, which is a case we must handle, and `git-url-parse` throws on the bare `github.com/o/r` form a person gets from a chat message. |
| Progress parsing | BUILD | About sixty lines. It is the part every package got wrong. |

**This is reinvention of roughly sixty lines and it is a close call.** That sentence is here
deliberately and the build phase must not delete it. A literal reading of the assemble rather
than reimplement guardrail points at `simple-git`, which exposes `outputHandler` and hands you
the raw streams, so you could adopt it for spawning and abort and own only the parser. Two
facts about this application decide against that. `simple-git` sets none of the four
credential switches in section 3.7, so the security critical part is ours either way. And its
`clone()` API cannot carry the `-c core.askPass=` prefix without dropping to `raw()`, at which
point the package contributes a promise wrapper.

### 3.3 Where the code lives

`src/main/projects/index.ts` says in its own header that `projects:create` sits apart from the
frozen `projects:*` channels because it is the only project channel that writes to the
filesystem. Cloning is the second one. It belongs next to it.

```
   src/main/projects/clone.ts     new. the runner, the parser, the temp dir and the rename
   src/main/projects/index.ts     wires the three channels, and calls the same addProject
   src/main/git/exec.ts           unchanged. see below
```

**`GitService` cannot host clone and `runGit` cannot run it.** `GitService` is constructed
with a repository path, `normalizeRepoPath` throws `INVALID_INPUT` unless the path is an
existing directory, and nearly every method calls `assertIsRepo()` first. A clone's cwd is the
parent directory and its target does not exist yet. Four properties of `runGit` also do not
fit, and a clone must not change them for everyone else.

| Property today | Why it does not fit a clone |
| --- | --- |
| `cwd` is `repoPath`, an existing repository | A clone has no repository yet. |
| stderr is buffered to 1 MiB and returned at the end | Progress is a stream. Nothing could be shown until the clone finished. |
| One wall clock timeout, default 30 s, and 120 s for fetch | A 101 s clone would be killed. |
| Timeout expiry calls `child.kill('SIGKILL')` | A SIGKILL leaves a partial directory behind. See 3.9. |

The two modules should share one exported environment builder, so the credential rules in
section 3.7 are written once rather than twice.

### 3.4 URL normalisation

What git itself accepts, tested with `git ls-remote`.

| Pasted string | git accepts | Note |
| --- | --- | --- |
| `https://github.com/o/r.git` | Yes | |
| `https://github.com/o/r` | Yes | |
| `https://github.com/o/r/` | Yes | |
| `https://github.com/o/r/tree/main` | No | `fatal: repository '.../tree/main/' not found` |
| `https://github.com/o/r.git?x=1` | No | `could not determine hash algorithm; is this a git repository?` |
| `github.com/o/r` | No | Treated as a local path. |
| `o/r` | No | Treated as a local path. |
| `git@github.com:o/r.git` | Yes, over SSH | |
| `ssh://git@github.com/o/r.git` | Yes, over SSH | |

Four of the nine forms a person will realistically paste do not work if passed straight
through, so normalisation is not optional. Apply these rules in order and stop at the first
that matches.

1. Trim whitespace, including a trailing newline from a paste.
2. If the string matches `^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$`, treat it as GitHub shorthand and
   expand it to `https://github.com/<owner>/<repo>.git`. Assuming GitHub for a bare
   `owner/repo` is a product decision and it should be stated in the interface, which the
   Repository field does by showing the resolved URL under it once preflight has run.
3. If the string matches the scp form `^[^/@]+@([^:/]+):(.+)$`, rewrite it to
   `https://<host>/<path>` and remove any username. Do not reject it. The person pasted a real
   repository address and Tortie can serve it over https. Tell them in one line that Tortie
   will use https, so they are not surprised when it asks for a token rather than using their
   key.
4. If the string starts with `ssh://` or `git://`, rewrite it the same way, with the same one
   line of explanation.
5. If the string has no scheme but contains a dot before the first slash, prepend `https://`.
6. Parse it as a URL. Reject anything whose protocol is not `https:` or `http:` after the
   rewrites above. Reject `file:` explicitly.
7. Drop the query string and the fragment.
8. Strip a trailing slash.
9. Strip a web page suffix from the path. For a path with three or more segments, cut at a
   segment that is one of `tree`, `blob`, `pull`, `pulls`, `issues`, `commit`, `commits`,
   `releases`, `wiki`, `actions`, `compare`, `-`. The `-` covers GitLab, whose web URLs put
   `/-/tree/main` after the project path.
10. Remove any `user:password@` from the authority. Drop it rather than keeping it, never store
    it, never log it, and never render it. The interface says in one line that a token in the
    URL was ignored. **Strip it before the string is put in the field, not only before the
    clone**, because the field is prefilled from the clipboard.
11. Append `.git` if the last path segment does not already end in it. This is optional for
    GitHub and required by some servers.

The folder name comes from the last path segment with `.git` removed. Show it and let the user
change it before they start. Run it through `validateProjectName` from
`src/shared/project-create.ts` before showing the preview line, so a clone and a create refuse
the same names for the same reasons.

Rules 3 and 4 rest on a reading of the operator's instruction that needs confirming. The
reading is that SSH out of scope means do not implement the SSH transport, and not reject a
pasted SSH URL. Rewriting to https serves the user better than refusing them, and section 7
puts it to the operator.

### 3.5 Preflight

Run this before creating anything on disk.

```
git ls-remote --symref -- <normalisedUrl> HEAD
```

It took 0.22 s to 0.23 s across three runs against `microsoft/TypeScript`. It answers three
questions at once.

- Does the URL resolve, and is it a git repository.
- Can we authenticate. If not, we can say so before the user has committed to a folder.
- What is the default branch, from the `ref: refs/heads/main HEAD` line.

This turns almost every failure in section 3.12 into something the user reads before anything
exists on disk, rather than after a partial download.

**Preflight never runs on its own.** It runs when the Repository field loses focus, and when
the user submits. It does not run when the dialog opens and it does not run on every
keystroke. The reason is that the field is prefilled from the clipboard, and a preflight on
open would send a request, along with whatever credential the keychain offers for that host,
to whatever address happened to be on the clipboard. The user did not ask for that.

### 3.6 The command

```
git \
  -c core.askPass= \
  -c credential.interactive=false \
  clone --progress \
  -- <normalisedUrl> <tempDir>
```

| Part | Why |
| --- | --- |
| `-c core.askPass=` | Required. Section 3.7 shows that a configured `core.askPass` beats `GIT_TERMINAL_PROMPT=0`. |
| `-c credential.interactive=false` | A precaution for third party helpers such as Git Credential Manager, which read it. Unverified, because that helper is not installed on this machine. `osxkeychain` ignores it. |
| `--progress` | Required. Without it git prints nothing when stderr is a pipe. |
| `--` | Stops a URL beginning with a dash from being read as an option. |
| `<tempDir>` | The `mkdtemp` directory from section 3.9. Git clones happily into an existing empty directory, which was verified. |

**No `--depth`.** Measured on `microsoft/TypeScript`.

| Mode | Time | On disk | Commits reachable | Remote branches |
| --- | --- | --- | --- | --- |
| Full clone | 101.0 s | 3538 MB | 36,770 | Not measured |
| `--filter=blob:none` | 50.6 s | 1690 MB | 36,770 | 372 |
| `--depth 1` | 16.5 s | 653 MB | 1 | 2 |

A full clone is the default because Tortie exists for coding agents. An agent that runs
`git log`, `git blame` or `git bisect` in a depth 1 clone gets a wrong answer rather than an
error. `--depth 1` also implies `--single-branch`, and the depth 1 clone ended with 2 remote
branches where the repository has 372.

**No `--recurse-submodules` and no `--filter=blob:none`, and no controls for either.** A
partial clone turns an offline `git show` into a failure, which is a surprise the user did not
choose. Both are git command furniture on a screen whose job is to open a project. If a user
asks for them later, they arrive as a preference and not as two more checkboxes in a dialog.
What follows from cutting them is stated plainly in section 3.15.

### 3.7 The environment

This is the part that is easiest to get wrong, and a clone that hangs forever is worse than a
clone that fails.

```ts
{
  ...process.env,                  // never a scrubbed env
  PATH: await getUserPath(),       // src/main/tmux/resolve.ts, the login shell PATH
  HOME: process.env.HOME,          // must be the real home, see below
  GIT_TERMINAL_PROMPT: '0',
  GIT_ASKPASS: '',
  SSH_ASKPASS: '',
  GIT_OPTIONAL_LOCKS: '0',
  LC_ALL: 'C'                      // stable English text for the parser
}
// GIT_CONFIG_NOSYSTEM must NOT be set. The keychain helper lives in the system config.
```

**The hang is real and it is reachable in development every day.** With stdio set to pipes and
no controlling terminal, which is what a Tortie launched from the Dock has, git fails in
435 ms with `fatal: could not read Username for 'https://github.com': Device not configured`.
With a controlling terminal, which is what a Tortie launched from `npm run dev` in a terminal
has, git opens `/dev/tty`, writes the prompt there and blocks. Run under a pseudo terminal
that never types anything, the only output after 14 s was the prompt, and a 10 s watchdog had
to kill it.

**`GIT_TERMINAL_PROMPT=0` is necessary and not sufficient.** It turns the hang into a failure
in 143 ms with `fatal: could not read Username for 'https://github.com': terminal prompts
disabled`. But git prefers an askpass program over the terminal, and this variable does not
disable askpass. With `GIT_ASKPASS` set to a script and `GIT_TERMINAL_PROMPT=0` still set, git
ran the askpass program anyway. The same is true of `core.askPass` in the user's git config,
which also beat it. So all four switches are required, and the config one needs the `-c`
override on the command line because an environment variable cannot clear it.

**`HOME` controls the keychain, and this would have been a bug in the build.**
`git-credential-osxkeychain` reads the login keychain, and macOS resolves the login keychain
through the home directory.

```
$ security default-keychain
    "/Users/gdc/Library/Keychains/login.keychain-db"

$ HOME=/tmp/isolated security default-keychain
security: SecKeychainCopyDefault: A default keychain could not be found.
```

The same private clone went from succeeding in 603 ms to failing with "could not read
Username" with only `HOME` changed. The clone environment must carry the real home directory.
It must not be scrubbed and it must not be replaced with a sandbox path.

**`GIT_CONFIG_NOSYSTEM` must never be set.** Setting it is a reasonable instinct for a
controlled environment and it would break every private clone. The `osxkeychain` helper is
configured in Xcode's system git config and nowhere else.

```
$ git config --show-origin --get-all credential.helper
file:/Applications/Xcode.app/Contents/Developer/usr/share/git-core/gitconfig  osxkeychain
```

**`PATH` must come from `getUserPath()`.** A Finder launched macOS application gets a minimal
PATH that does not include `/opt/homebrew/bin`. `src/main/git/exec.ts` spawns with
`...process.env` and never injects the login shell PATH, so anything the user installed with
Homebrew is invisible in the packaged application while working in development.
`getUserPath()` in `src/main/tmux/resolve.ts` captures the login shell PATH once per boot and
always resolves.

**Tortie does not configure `gh` as a credential helper.** It works when wired by hand. With
the keychain helper cleared and only `credential.helper='!gh auth git-credential'` in place, a
private clone succeeded, and with no helper at all the same clone failed. But `gh auth
setup-git` has never been run on this machine, and adding a helper means Tortie is quietly
changing how git authenticates for a user who did not ask. Use `gh` for one thing instead,
which is the explanatory second line in the credential failure message in section 3.12.

**Tortie never builds a username or password form.** Credentials belong to the system, which
means the keychain, the SSH agent, or a tool such as `gh auth`. A password field inside Tortie
would be a new security surface with nothing to gain.

### 3.8 Spawn options and timeouts

```ts
{
  cwd: parentDir,
  env,
  stdio: ['ignore', 'pipe', 'pipe']   // stdout is piped for a future LFS phase
}
```

**Not `detached: true`.** The first draft called for a detached child and a process group
kill. No measurement supports it. SIGINT to a non detached child left no `git-remote-https`
and no `index-pack` running. SIGTERM to a non detached child 92 MiB into Receiving, with two
live grandchildren, removed the destination and left zero orphan processes. Killing the parent
Node process five seconds in also left nothing, because git took EPIPE on its progress write
and cleaned up. Detaching buys nothing here and costs the one hazard nobody specified, which
is a clone that outlives the window.

Two consequences follow and both must be built.

- Signal the child directly with SIGTERM.
- Register a handler on `before-quit` that cancels any running clone, so quitting during a
  clone is the same code path as pressing Cancel.

**There is no total timeout.** A 101 s clone is normal and a 20 minute clone of a large
monorepo is normal.

**There is a stall timeout.** If no byte arrives on stderr for 120 s, cancel with SIGTERM and
report the interrupted transfer message from section 3.12. 120 s sits above git's own 75 s
connect timeout, so a slow connection is reported by git rather than pre-empted by us.

### 3.9 The temporary directory and the rename

Git cleans up after itself if the signal lets it.

| Signal | Destination afterwards | Measured |
| --- | --- | --- |
| SIGTERM early, 4 s in | Removed. 0 files. | Yes |
| SIGTERM late, 110.56 MiB into Receiving | Removed. 0 files. | Yes |
| SIGTERM at 92 MiB, with two live grandchildren | Removed. 0 files. 0 orphan processes. | Yes, independently |
| SIGINT | Removed. No leftover `git-remote-https` or `index-pack`. | Yes |
| SIGKILL | Survives. 19 files, 26,416 bytes, containing a half built `.git`. | Yes |

So Tortie cancels with SIGTERM and never with SIGKILL. That still leaves two cases git cannot
clean up after, which are a SIGKILL and a crash or power loss. Neither is rare enough to
ignore, because quitting Tortie during a long clone is a thing a person will do.

```
   user picks parent /Users/me/src and name "tortie"
                     |
                     v
   mkdtemp  ->  /Users/me/src/.tortie-clone-BfgUzn
                     |
              git clone --progress -- <url> .tortie-clone-BfgUzn
                     |
        exit 0 ------+------ non-zero, cancelled, or crash
           |                        |
           v                        v
   rename to /Users/me/src/tortie   rm -rf the temp dir
           |                        (and on next launch, sweep any
           v                         .tortie-clone-* older than a day)
   addProject /Users/me/src/tortie
```

Three things make this safe and each was checked.

- A git repository is relocatable. A clone was renamed and both `git status` and
  `git rev-parse --show-toplevel` worked and reported the new path.
- The rename is within one directory, so it is atomic and there is no copy.
- A leftover is unambiguously ours, because of the name and the leading dot. A sweep at launch
  can remove `.tortie-clone-*` in any parent directory Tortie itself chose, with no risk of
  deleting something a user made.

This was run end to end. The reference implementation cloned `microsoft/TypeScript` at depth 1
into a temporary directory, renamed it into place, and reported 510 progress frames across six
phases with no temporary directory left behind. Cancelling the same clone with SIGTERM after
4 s left neither the temporary directory nor the final path on disk.

Cloning directly to the final path is simpler and is what the command line does. It is not
recommended because a SIGKILL or a crash then leaves a directory at exactly the name the user
asked for, containing a broken repository, and the next attempt fails with "already exists and
is not an empty directory" while pointing at something the user believes is their project.

### 3.10 Progress, and what the dialog shows

`git clone --progress` forces progress on even when stderr is not a terminal. It all goes to
stderr, and stdout was zero bytes on every clone run. Frames are separated by carriage
returns and not newlines. A phase ends with a newline on a line ending in `, done.`.

A depth 1 clone of `microsoft/TypeScript` produced six phases in 24,753 bytes of stderr.

| git phase | Frames | Example frame | Tortie says |
| --- | --- | --- | --- |
| Enumerating | 1 | `remote: Enumerating objects: 75447, done.` | Preparing on the server |
| Counting | 102 | `remote: Counting objects:  51% (38478/75447)` | Preparing on the server |
| Compressing | 105 | `remote: Compressing objects:  50% (27987/55974)` | Compressing on the server |
| Receiving | 105 | `Receiving objects:  50% (37724/75447), 18.25 MiB \| 9.01 MiB/s` | Downloading |
| Resolving | 102 | `Resolving deltas:  51% (10368/20327)` | Setting up |
| Checking out | 90 | `Updating files:  59% (48800/81368)` | Writing files |

Five of the six carry a real percentage with a numerator and a denominator. Enumerating
carries only a count and appears once.

**Four rules govern the display, and each one exists to stop a specific lie.**

1. **The bar shows the current phase's own percentage and it resets when the phase word
   changes.** Git prints a percentage per phase and never an overall one. A single monotonic
   bar weighted across the phases is a number nothing produced. The first draft weighted
   counting and compressing as 0 to 15, receiving as 15 to 85, and the rest as 85 to 100.
   Measured on the depth 1 TypeScript clone, resolving and checking out were 192 of 505 frames,
   so the last 15 percent of that bar would have covered roughly a third of the wait.
2. **The phase word changing is what tells the user the bar reset.** That is why the words are
   one per git phase rather than three collapsed words. Collapsing them makes a bar reset
   inside a single unchanging label, which looks broken.
3. **There is no indeterminate bar.** An indeterminate bar is perpetual motion, and DESIGN.md
   section 5 reserves perpetual motion for the needs input pulse. While the word is "Preparing
   on the server" and no percentage has arrived, the bar is empty and still.
4. **A phase that never arrives must not leave a stalled bar.** On a full clone of
   `expressjs/express` no `Updating files:` phase appeared at all, because the checkout
   finished under git's own two second progress threshold. Phases arrive in git's order and
   any of them can be skipped. The display must handle that, and the clone ends by the dialog
   closing rather than by the bar reaching 100.

**Byte figures.** Git prints a cumulative figure during Receiving and never a denominator.
The only denominators anywhere in the output are object counts. The line
`Receiving objects: 100% (33522/33522), 9.62 MiB | 46.88 MiB/s, done.` is the complete shape.
So "12.4 MB of 48.1 MB" can never render, and it is cut. If a byte figure is shown it is git's
own cumulative figure with git's own unit, which is MiB and not MB, and it stands alone with
no total and no rate.

```
 +----------------------------------------------------------+
 |  Clone repository                                        |
 |                                                          |
 |  https://github.com/sindresorhus/got.git                 |
 |  into ~/code/got                                         |
 |                                                          |
 |  Downloading                                             |
 |  +====================================----------------+  |
 |  4.1 MiB                                                 |
 |                                                          |
 |                                        +---------------+ |
 |                                        |    Cancel     | |
 |                                        +---------------+ |
 +----------------------------------------------------------+
```

**Frame volume needs no throttling.** The depth 1 TypeScript clone produced 510 parsed frames
in about 17 s, which is roughly 30 a second. If a denser repository turns up, coalesce in main
to one frame every 100 ms per phase, and always send the frame that ends a phase.

**One parser detail that was got wrong once already.** The very first `Cloning into '...'`
line is the top level clone and not a submodule. Treat the first one as the start of the clone.

**Large file storage is a second unbounded step and it is unverified.** The operator's
`~/.gitconfig` configures the `lfs` filter globally, so a clone of a repository that uses it
will fetch the real content during checkout. The content was confirmed to be fetched, with a
real 8,388,608 byte file appearing rather than a pointer. Git's `Filtering content:` progress
line was not observed, because the local transfers finished under git's two second threshold.
Pipe stdout as well as stderr so a future frame of that kind is not lost, and add the phase to
the parser when someone can observe it.

### 3.11 Cancel

While a clone runs, the dialog is the operation. Esc does nothing and clicking the scrim does
nothing. Only the Cancel button ends it, and it reads `Stopping...` while it does.

Esc is deliberately disabled here, and this is the one place in the application where Esc does
not close the topmost layer. Esc is a reflex. A keystroke that silently kills a two minute
download because the user dismissed a dialog out of habit is the class of accident this
product refuses everywhere else.

**The line the user reads after a cancel is reported by main and not hardcoded in the
renderer.** The renderer cannot know whether the cleanup worked, and a hardcoded sentence ships
a false statement the first time a removal fails.

| What main did | What the user reads |
| --- | --- |
| The temporary directory was removed | Clone cancelled. Nothing was left on disk. |
| The removal failed | Clone cancelled. Tortie could not remove `<path>`. You can delete it yourself. |

### 3.12 Failure modes and the message the user reads

The raw git text goes into the `detail` field of the structured error, which is the pattern
`src/main/errors.ts` already uses, so it is available behind `Show details` and not in the
user's face.

| Case | What git prints | What the user reads |
| --- | --- | --- |
| Not a repository address | `fatal: repository '<x>' does not exist` | That does not look like a repository address. It should start with `https://` or `git@`. |
| No network | `fatal: unable to access '<url>': Could not resolve host: <host>` | Tortie could not reach `<host>`. Check your internet connection and try again. |
| Host unreachable | `fatal: unable to access '<url>': Failed to connect to <host> port 443 after 75003 ms: Couldn't connect to server` | Tortie could not connect to `<host>`. The server may be down, or a VPN may be needed. |
| Repository not found, and we were authenticated | `remote: Repository not found.` then `fatal: repository '<url>/' not found` | Tortie could not find `<owner>/<repo>`. Check the address, and check that your account has access to it. |
| Private, and we were not authenticated | `fatal: could not read Username for 'https://<host>': terminal prompts disabled` | Tortie could not sign in to `<host>`. Clone this repository once from your terminal so macOS saves the credential, then try again. When `gh` resolves on the login PATH and `gh auth status` succeeds, add a second line saying that running `gh auth setup-git` will let git use your GitHub login. |
| Wrong or expired credential | `remote: Invalid username or token. Password authentication is not supported for Git operations.` then `fatal: Authentication failed for '<url>'` | The saved credential for `<host>` was rejected. It may have expired. Sign in again from your terminal, then try again. |
| Destination already exists | `fatal: destination path '<path>' already exists and is not an empty directory.` | Caught before the clone starts, by `validateProjectName` and the existence check. Reuse the wording `src/main/projects/create.ts` already ships, which is `'<name>' already exists in that folder.` |
| Parent not writable | `fatal: could not create work tree dir '<path>': Permission denied` | Tortie cannot write to that folder. Choose another one. |
| Disk full | `fatal: write error: No space left on device` then `fatal: fetch-pack: invalid index-pack output` | The disk filled up before the clone finished. Nothing was left behind. Free some space and try again. |
| Interrupted transfer | Varies. Commonly `fatal: early EOF` or `fatal: fetch-pack: invalid index-pack output` | The download stopped before it finished. Nothing was left behind. Try again. |
| Cancelled by the user | Killed by SIGTERM, with no fatal line | Not an error. Section 3.11. |
| No git installed | The spawn fails with `ENOENT` | Reuse the existing message from `src/main/git/exec.ts`, which names `xcode-select --install`. |

**Four notes on this table, and each one is load bearing.**

The private and unauthenticated row is the commonest private repository failure, and the first
draft had no row for it. Without the row it falls through to the generic network message,
which is exactly the wrong diagnosis.

Not found and private are two distinct states with two distinct remedies, and they must not be
collapsed into one sentence. GitHub returns the same two lines for a repository that does not
exist and for one you cannot read, and it does that deliberately, so Tortie must not guess
between those two. But an unauthenticated request produces the credential path instead, which
is a different state with a different fix. GitLab differs again, because an unauthenticated
request for a repository that does not exist returned the credential prompt path rather than a
404. So on GitLab a typo and a private repository are indistinguishable to us, and the not
found copy says both possibilities in one sentence rather than picking one.

Every "nothing was left behind" claim in that table is true only because of the temporary
directory in section 3.9. Do not ship that copy without that mechanism.

Match on stable substrings and never on whole lines, e.g. `Could not resolve host`. If nothing
matches, show the last non empty stderr line verbatim under a generic heading rather than
inventing a diagnosis. The 75,003 ms in the unreachable host row is git's own connect timeout
and it is not configurable through git, which is why the stall watchdog in section 3.8 is
required rather than optional.

Below the message is a `Show details` text button that expands git's raw stderr in a mono block
inside the dialog. That is the same pattern DESIGN.md section 6.11 already uses for a failed
commit, so it is reused rather than invented.

### 3.13 The dialog

DESIGN-SPEC S6 says the New Project dialog follows the `#T` modal exactly and that the two must
not read as two different products. This is the third and the rule now covers three. It takes
the same 480 px width, the same 20 vh anchor, the same scrim, the same field rhythm, the same
path preview line, Enter to submit from any field and Esc to cancel while it is editable.

```
 +----------------------------------------------------------+
 |  Clone repository                                        |
 |                                                          |
 |  Repository                                              |
 |  +----------------------------------------------------+  |
 |  | https://github.com/owner/repo.git                  |  |
 |  +----------------------------------------------------+  |
 |                                                          |
 |  Folder name                                             |
 |  +----------------------------------------------------+  |
 |  | repo                                               |  |
 |  +----------------------------------------------------+  |
 |                                                          |
 |  Clone it into                                           |
 |  +-------------------------------------+  +-----------+  |
 |  | ~/code                              |  | Choose... |  |
 |  +-------------------------------------+  +-----------+  |
 |                                                          |
 |  Creates  ~/code/repo                                    |
 |                                                          |
 |                          +--------+  +-----------------+ |
 |                          | Cancel |  | Clone repository| |
 |                          +--------+  +-----------------+ |
 +----------------------------------------------------------+
```

| Field | Behaviour |
| --- | --- |
| Repository | Set in mono, because it is an address and the sibling dialog already sets its path field in mono. Prefilled from the clipboard when the clipboard holds something that parses as a git URL, as real selected text and never as a ghost placeholder. Any `user:password@` is stripped before the string is put in the field. |
| Folder name | Derived from the last path segment of the URL with any `.git` suffix removed, filled the moment the URL parses, and editable after that. This field is what turns a git command into a project. |
| Clone it into | The same picker and the same prefill logic as New Project. With no project open there is nothing to guess from, so it stays empty and `Choose...` takes the focus. |
| Creates | The same safety line as New Project. It says exactly what will be made and where, before anything is written. Its height is reserved so the dialog never jumps. |

There is no git init checkbox, because the thing being cloned is already a repository. There
are no branch, depth or submodule controls, for the reason in section 3.6.

**Strings.**

| Slot | String |
| --- | --- |
| Title | Clone repository |
| Field 1 label | Repository |
| Field 1 placeholder | https://github.com/owner/repo.git |
| Field 2 label | Folder name |
| Field 3 label | Clone it into |
| Field 3 placeholder | Choose a folder... |
| Field 3 button | Choose... |
| Preview label | Creates |
| Primary button | Clone repository |
| Primary button, busy | Cloning... |
| Secondary button | Cancel |
| Cancel button, busy | Stopping... |
| Phase words | Preparing on the server / Compressing on the server / Downloading / Setting up / Writing files |
| Rewritten from SSH | Tortie will use https for this address. |
| Credential stripped | Tortie ignored the sign in details in that address. |
| After a cancel | Reported by main. See section 3.11. |
| Details toggle | Show details / Hide details |

**Why the dialog blocks.**

| Option | Verdict | Deciding reason |
| --- | --- | --- |
| The dialog blocks until the clone ends | Chosen | There is exactly one clone at a time and it is the thing the user just asked for. |
| The dialog closes and a toast carries the progress | Rejected | Toasts are 360 px and auto dismiss after 5 seconds. An error would arrive detached from the thing that caused it. |
| A project tab opens immediately and the clone runs inside it | Rejected | A project tab whose folder does not exist is a lie, and it puts git output on screen. |
| The clone runs in a real session so the user watches git work | Rejected | That is running a git command, which is the thing this screen exists not to do. It also spends a durable session on a one shot task. |
| A background clone with a resumable progress view | Rejected for now | It is a persistent operation model the application does not have, built for a rare and usually short action. |

The cost of that choice, named rather than hidden. A clone launched from inside a project
blocks that window for as long as it runs. The agents in it keep working and cannot be typed
to. The measured clone of a 6.3 MB repository took under 10 seconds, so the common case is
short. If a user reports a slow clone, the fix is a `Continue in the background` text button
that appears beside Cancel after 20 seconds and hands the progress to a sticky toast. That is
written here so it is a deliberate deferral and not an omission.

**After it succeeds.** The dialog closes, the new project opens as a focused tab, and the
keyboard moves onto the default agent tile. That is the same handoff the New Project dialog
already performs, so the path from nothing to a running agent stays the same shape.

### 3.14 The IPC surface

One appended block at the foot of `src/shared/ipc.ts`, which is append only during parallel
builds, plus one edit above to add the new map to the intersection.

The channels are named `projects:*` and not `git:*` or `clone:*`. Two reasons decide it. The
operation ends in a project tab, which is the `projects:*` family. And `git:*` is per
repository and normalizes an existing repository path, which a clone cannot have.

```ts
// ---------------------------------------------------------------------------
// APPENDED by Phase 18.6. Cloning a repository from the home screen.
//
// Shaped like search:* above and for the same reason. A clone runs for 0.6 s on
// a five object repository and 101 s on microsoft/TypeScript, so the only honest
// contract is a streaming one. `projects:clone` resolves as soon as git is
// spawned, frames arrive on cloneProgressChannel(cloneId), and the last frame
// carries either the created Project or the failure.
//
// SUBSCRIBE FIRST, same rule as search:start.
// ---------------------------------------------------------------------------

/** What the preflight learned about a pasted string, before anything is created. */
export interface ClonePreflight {
  /** The https URL Tortie will actually clone. Never carries a password. */
  url: string;
  /** Host, for the copy in error messages, e.g. "github.com". */
  host: string;
  owner?: string;
  repo?: string;
  /** Suggested folder name, which is the last path segment without `.git`. */
  suggestedName: string;
  /** From `git ls-remote --symref`, e.g. "main". Absent when the server did not say. */
  defaultBranch?: string;
  /** Set when the input was rewritten to https from an scp or ssh form. */
  rewrittenFromSsh?: boolean;
  /** Set when a user:password was removed from the pasted URL. */
  strippedCredential?: boolean;
}

export interface ClonePreflightInput {
  /** Exactly what the user pasted or typed. */
  raw: string;
}

export interface CloneStartInput {
  /** Mint this in the renderer and subscribe before calling clone. */
  cloneId: string;
  /** The url from ClonePreflight, not the raw paste. */
  url: string;
  /** Absolute path of the EXISTING parent directory, from the native picker. */
  parentDir: string;
  /** Folder name to create inside it, one path segment. */
  name: string;
}

/** The named steps of a clone, in the order git performs them. Any may be skipped. */
export type ClonePhase =
  | 'starting'      // spawned, nothing parsed yet
  | 'enumerating'   // remote: Enumerating objects: N, done.
  | 'counting'      // remote: Counting objects: P% (n/t)
  | 'compressing'   // remote: Compressing objects: P% (n/t)
  | 'receiving'     // Receiving objects: P% (n/t), X MiB | Y MiB/s
  | 'resolving'     // Resolving deltas: P% (n/t)
  | 'checkingOut';  // Updating files: P% (n/t)

/**
 * One progress frame. `percent` is HONEST ONLY WITHIN `phase`. There is no
 * overall percentage and the renderer must not synthesize one (research 35 §3.10).
 */
export interface CloneProgress {
  cloneId: string;
  phase: ClonePhase;
  /** 0 to 100 within this phase. Absent for 'starting' and 'enumerating'. */
  percent?: number;
  done?: number;
  total?: number;
  /** Receiving only, e.g. "18.25 MiB". Straight from git, in git's own unit. */
  bytes?: string;
}

/** The last frame on the stream. Exactly one of `project` or `error` is set. */
export interface CloneDone {
  cloneId: string;
  done: true;
  /** True when the user cancelled. Not an error state. */
  cancelled?: boolean;
  /**
   * Cancel only. What main actually did on disk, because the renderer must not
   * assert a cleanup it did not perform (research 35 §3.11).
   */
  leftoverPath?: string;
  /** Present on success. Already added to the manifest, ready to open. */
  project?: Project;
  /** Absolute path of the cloned folder, on success. */
  path?: string;
  /** Branch git checked out, for the line under the address. */
  defaultBranch?: string | null;
  /** Present on failure. `kind` picks the copy, `detail` is git's own text. */
  error?: {
    kind: CloneFailureKind;
    message: string;
    detail?: string;
  };
}

/**
 * Which failure happened, so the renderer picks copy rather than parsing text.
 * Main classifies by matching stable substrings of git's stderr (research 35
 * §3.12). Anything unmatched becomes 'unknown', and the renderer then shows the
 * last stderr line verbatim rather than inventing a diagnosis.
 */
export type CloneFailureKind =
  | 'badUrl'
  | 'network'          // Could not resolve host
  | 'unreachable'      // Failed to connect
  | 'notFound'         // Repository not found, or private; the host will not say which
  | 'unauthenticated'  // could not read Username
  | 'authRejected'     // Authentication failed
  | 'destinationExists'
  | 'permission'
  | 'diskFull'
  | 'interrupted'      // early EOF, invalid index-pack output, or our stall timeout
  | 'gitMissing'
  | 'unknown';

export interface CloneInvokeChannelMap {
  /** Normalise a pasted string and ask the server about it. About 0.23 s. */
  'projects:clonePreflight': {
    req: [input: ClonePreflightInput];
    res: ClonePreflight;
  };
  /** Spawn git. Frames arrive on cloneProgressChannel(cloneId). */
  'projects:clone': { req: [input: CloneStartInput]; res: { cloneId: string } };
  /** SIGTERM the child and close the stream with cancelled:true. */
  'projects:cancelClone': { req: [cloneId: string]; res: void };
}

/** Per clone stream, following searchResultsChannel(searchId). */
export const cloneProgressChannel = (cloneId: string): string =>
  `projects:cloneProgress:${cloneId}`;

/**
 * OPTIONAL surface on window.gmux.projects, feature detected by the home screen
 * (`typeof window.gmux.projects.clone === 'function'`) so an older preload hides
 * the Clone row instead of throwing. Same pattern as the create extras.
 */
export interface GmuxProjectCloneExtras {
  clonePreflight?(input: ClonePreflightInput): Promise<ClonePreflight>;
  clone?(input: CloneStartInput): Promise<{ cloneId: string }>;
  cancelClone?(cloneId: string): Promise<void>;
  /** Subscribe BEFORE calling clone(), with an id you minted. */
  onCloneProgress?(
    cloneId: string,
    cb: (p: CloneProgress | CloneDone) => void
  ): Unsubscribe;
}
```

Four decisions in that shape, with the reason for each.

- Preflight is its own channel rather than part of the clone. It costs 0.23 s and it moves
  every URL failure and every authentication failure to before a folder exists. It also
  supplies the default branch name and the suggested folder name.
- The terminal frame goes on the stream and not on the `projects:clone` promise, which
  resolves in milliseconds. Putting the result on the stream means there is one place the
  renderer listens and one ordering to reason about.
- No new `GmuxErrorPayload` code. `CloneFailureKind` lives on the frame instead, so the frozen
  union in `src/shared/types.ts` stays untouched. Preflight can still throw `INVALID_INPUT` and
  `GIT_FAILED` through the existing `gmuxError` path.
- Success returns a `Project` and not just a path. Main calls the same `addProject` that
  `projects:create` calls, so the manifest is written by one function.

The main side registration copies `src/main/search/ipc.ts`, which builds a per `WebContents`
sink and calls `sender.once('destroyed', ...)` so a closed window stops receiving frames. The
preload subscription copies the block at `src/preload/index.ts` around line 298.

### 3.15 What clone deliberately does not do

Each of these is a real limitation. A user will hit them, and the honest position is that they
are named here rather than discovered later.

- **Submodules are not fetched.** A repository with submodules clones with empty submodule
  directories, exactly as `git clone` on the command line does. Nothing in Tortie offers to
  fetch them afterwards.
- **SSH is not used.** A pasted `git@host:owner/repo.git` is rewritten to https, and the user
  is told so in one line. A user whose only access is a key on a host with no https endpoint
  cannot clone through Tortie.
- **There is no partial or shallow clone.** A large monorepo takes as long as it takes. The
  measured full clone of `microsoft/TypeScript` was 101.0 s and 3538 MB.
- **There is no branch selection.** The clone checks out the remote's default branch, and the
  preflight already knows its name.
- **There is no queue.** One clone at a time, in the window that started it.
- **Tortie never asks for a username or a password.**

### 3.16 What was not verified in the clone work

- A non English locale was not tested. `LC_ALL: 'C'` is a precaution and not a measured fix.
- `credential.interactive=false` was not verified, because Git Credential Manager is not
  installed on this machine. `osxkeychain` ignores the setting.
- Git's `Filtering content:` line for large file storage was not observed, so the exact text of
  that frame is unverified.
- A full clone of `microsoft/TypeScript` was not run under `isomorphic-git`. The 2.9 times and
  the 287 MB come from `expressjs/express`, which is 13 MB.
- A proxy was not tested, and neither was a self hosted host that requires a client
  certificate.
- All timings are one machine on one network on one day. The ratios are the durable part and
  the absolute seconds are not.
- The claim about what VS Code, GitHub Desktop and Eclipse Theia use comes from package
  manifests and source, not from running those applications.

---

## 4. The integration map

### 4.1 File by file

Sizes are lines, measured in the working tree on 2026-08-12.

| File | Lines now | What Phase 18.6 does to it |
| --- | --- | --- |
| `src/renderer/app/EmptyStates.tsx` | 252 | `FirstRun` becomes a thin wrapper that renders the new module. `NoSessions` and `TmuxMissing` are untouched. |
| `src/renderer/app/HomeScreen.tsx` | new | The whole screen. It stops being an empty state, because it has its own data, its own three verbs and its own dialog. Keeping it in `EmptyStates.tsx` would push that file past 450 lines with two unrelated domains in it, which is the split trigger in the growth guardrails. |
| `src/renderer/app/home-screen.css` | new | Colocated, matching `empty-states.css`. Every override qualified with a second class, so it beats `app.css` on specificity and never on bundle order. That rule is written in the header of `empty-states.css` and it binds this file too. |
| `src/renderer/app/empty-states.css` | 117 | Untouched. `.onb-inner` stays at 660 px, because widening it would silently reflow `NoSessions` and `TmuxMissing`. The home screen brings its own 460 px container. |
| `src/renderer/app/CloneRepoModal.tsx` | new | Copies `NewProjectModal.tsx` in shape, including the focus handoff at the end. |
| `src/renderer/app/NewProjectModal.tsx` | 256 | The `setTimeout(120)` plus `.onb-tile.primary` focus handoff lifts into a shared helper, so both dialogs call one function. |
| `src/renderer/app/project-menu.ts` | 55 | Gains the third item, `Clone Repository...`. |
| `src/renderer/state/store.ts` | 1452 | The post create tail of `createProject`, which is list then set then `setActiveProject`, extracts into one private `adoptProject(project, extras)` helper. Both `createProject` and `cloneProject` call it. That is about 12 lines moved. |
| `src/renderer/app/focus-trap.ts` | existing | Gains `focusFleetPrimary()`, about 8 lines, so the two dialogs do not each own a copy. |
| `src/shared/ipc.ts` | 2306 | One appended block, section 3.14, plus adding the new map to the intersection. |
| `src/preload/index.ts` | existing | One subscription block, copied from the search one. |
| `src/main/projects/index.ts` | 70 | Registers the three channels and calls the same `addProject`. |
| `src/main/projects/clone.ts` | new | The runner, the parser, the temporary directory, the rename and the sweep. |
| `src/main/projects/create.ts` | 124 | Untouched. Its "already exists in that folder" message is reused by name. |
| `src/main/git/exec.ts` | 182 | Untouched. It exports its environment builder so the clone module uses one set of credential rules. |
| `src/main/recents/store.ts` | new | The JSON file. See 4.2. |
| `src/main/menu.ts` | existing | Gains `File > Open Recent`, built from the recents store. |
| `src/renderer/styles/tokens.css` | 212 | Two new tokens, `--text-brand` and `--lh-brand`. |
| `src/shared/keymap.ts` | existing | Untouched. Clone gets no chord. |

**What survives from the current screen and should be reused rather than rebuilt.** The
`.empty` container, `.empty-title`, `.empty-body`, `.btn` and its variants, the `.key` chips,
`keyDisplay()`, the `Codicon` component, and the `Keycap` component in `src/renderer/keys/`.

**One rule the new CSS must obey.** The header comment in `empty-states.css` states that every
override is qualified with a second class so it wins on specificity and never on bundle order.
A new container class that relies on Vite's ordering will break the moment the import order
changes.

### 4.2 Recents storage

**A plain JSON file at `<userData>/recents.json`, owned by main.** There is a precedent in the
codebase already, which is `src/main/settings/store.ts` at `<userData>/settings.json`.

| Requirement | Detail |
| --- | --- |
| Shape | An array of `{ path, name, lastOpenedAt }`, newest first. |
| Cap | 20 entries. Older entries are dropped on write. |
| Written | On open and on close. |
| Read | Top 5 for the home screen, top 3 on a short window, top 10 for `File > Open Recent`. |
| Removal | `Remove from Recent` deletes one entry. The native menu's `Clear Menu` convention clears all. |
| Corruption | A file that does not parse is replaced with an empty list. Losing recents costs nothing. |

**Why not the manifest.** The manifest at `<userData>/gmux/manifest.db` holds session restore
state, which is the product's promise. Recents are disposable convenience data, and losing them
costs nothing. Putting them in that database means a migration, a new table, a new read path
and a new failure mode, all inside the file that must never break. The Zen's line is that
anything durability critical should be boring and inspectable and older than this product.
Migrating that file for a convenience list inverts the risk.

**Why not localStorage.** Main needs the list, because main builds the native `File > Open
Recent` menu, and localStorage is renderer only. Note that the reason first offered for
rejecting localStorage was wrong on a fact. It said localStorage dies with a userData reset
that the manifest survives. Both live under the same userData directory and both die together.
The real reason is that main cannot read it.

**Today the data does not exist.** The `projects` table is `(id, path, name)` with no
timestamps, `listProjects()` is `SELECT * FROM projects ORDER BY name ASC`, and closing a
project hard deletes the row through `deleteProject`. The home screen only appears when
`projects.length === 0`, so `listProjects()` returns nothing on the exact screen that wants the
list.

**A session roll-up per path needs no plumbing and is no longer needed.** `listSessions()`
already returns sessions carrying `project_path`, so grouping by path would have been free.
That was the data behind the status dot, and the dot is cut.

### 4.3 Sequencing

```
   18.5  BUILDING now, edits src, commits
     |
     v
   18.55 zoom does not reach the search view
     |
     v
   18.6  the home screen and clone      <- this document
     |
     v
   19    durability
```

**Phase 18.6 must not start before Phase 18.5 has committed.** Item 5 of Phase 18.5 edits
`quickCreate` in `src/renderer/state/store.ts`, and Phase 18.6 edits `createProject` in the same
file. Phase 18.55 is small and touches `src/renderer/zoom/`, so it does not collide, and it is
scheduled between them in the backlog.

**Phase 19 waits for Phase 18.6, and the backlog already says so.** Item 8 of Phase 19 edits
`restartSession` in `src/renderer/state/store.ts`. Doing the renderer work together and then the
main process durability work means each file is written once.

**Line numbers quoted anywhere in this document are already at risk.** Phase 18 rewrote the
renderer state three commits ago and Phase 18.5 is editing further. Find each thing by its
symbol name and not by the line it was on.

---

## 5. What was cut, and why

An adversary reviewed the first draft against the Zen, the scope guardrail and the
measurements. Its objections are recorded here rather than smoothed away, because several of
them are the reason a later reader will not put the cut feature back.

### 5.1 The status dot, the count badge and the pulse on recent rows

**Cut.** This is the one place the first draft crossed the Zen's line.

The Zen says that no counters, no activity feeds and no progress theatre belong here, and that
a number that rises on its own is not a signal but noise in a nicer font. An amber count badge
on a project the user has closed is a number that rises on its own, on a screen where the user
cannot act on it. On a project tab the same badge is correct, because the user is inside that
work. Here they have left it.

Three further facts make it indefensible rather than merely arguable.

- It contradicts DESIGN.md section 5, which the same draft cited. That section says nothing
  animates on app load, and the home screen is the app load state. The draft then permitted the
  infinite needs input pulse on it, which is perpetual motion on the one screen the design
  system says must be still.
- The draft's own known gap paragraph invalidated the feature. It said a project with live
  sessions ranked sixth or older would not appear, and that the fallback is the menu bar tray,
  which lists every session regardless of which project it belongs to. If the tray is the right
  answer for rank 6, it is the right answer for ranks 1 to 5. The dot is a partial duplicate of
  a complete surface that already ships.
- It was unverified. Whether the dot updates while the home screen is on screen depends on
  whether the session broadcast reaches a renderer with no project open, and that was never
  tested. A dot that silently stops updating is worse than no dot.

The recents list itself passes the same tests and stays. The 40 px name indent that the dot
slot used to create is now made with padding.

### 5.2 The synthesized overall progress bar

**Cut.** The first draft mapped counting and compressing to bar 0 to 15, receiving to 15 to 85,
and resolving and checkout to 85 to 100, and then asserted that every value on the bar came
from a number git printed. That assertion was false, and the same document's own measurement
section said so. Git printed 46 percent of receiving. The bar would have shown 47 percent of
the clone, and nothing produced that second number.

The measurement that settles it. On the depth 1 TypeScript clone, resolving and checking out
were 192 of 505 frames, so the last 15 percent of that bar would have covered roughly a third
of the wait.

### 5.3 The byte total line

**Cut.** `12.4 MB of 48.1 MB` cannot render, because git never prints a byte denominator. The
complete shape of the final receiving line, measured today on a full clone of
`expressjs/express`, is `Receiving objects: 100% (33522/33522), 9.62 MiB | 46.88 MiB/s, done.`
The only denominators anywhere in git's output are object counts. The requirement that byte
totals are reported when git provides them resolves to never. Git also says MiB where the draft
said MB.

### 5.4 "Connecting to github.com..." held across four phases

**Cut.** The draft held that phrase across `Cloning into`, `Enumerating`, `Counting` and
`Compressing`. On the TypeScript clone those are 208 frames of real server work, and the
connection was established at the first byte. A user watching "Connecting" for thirty seconds
concludes their network is broken, and a stall there gets blamed on the wrong thing.

### 5.5 The hardcoded cancel sentence

**Cut as a hardcoded string.** "Clone cancelled. Nothing was left on disk." is true only if the
plumbing made it true, so main reports what it did and the renderer prints that. The underlying
claim is well founded and was measured twice independently, and it survives as the message main
sends when the removal succeeded.

### 5.6 The clone options in the dialog

**Cut.** The clone research proposed a `--recurse-submodules` checkbox defaulting off and a
`--filter=blob:none` option. Both are git command furniture and both fail the scope guardrail
by the design draft's own wording. The design draft wins that disagreement outright.

### 5.7 The manifest migration for recents

**Cut and replaced with a JSON file.** See section 4.2. As first specified it was a SQLite
migration, a new table, a new read path, a menu, a stat per row and a session roll-up, which is
more new machinery than the clone itself, for a screen the user sees only when zero projects
are open.

### 5.8 `detached: true` and the process group kill

**Cut.** No measurement supported it, and it costs the one hazard nobody specified, which is a
clone that outlives the window. Section 3.8 has the replacement and the three measurements.

### 5.9 The clipboard preflight on dialog open

**Cut.** Composed naively, the prefill from the clipboard and the validating input together
would fire `git ls-remote` at whatever host was on the clipboard the moment the dialog opened,
sending the user's keychain credential to it without being asked. Prefill yes. Preflight only
on an explicit user action. Section 3.5.

### 5.10 The scope guardrail applied to clone itself

**Not cut, because the operator asked for it. Recorded because the argument sets the size.**

Answered honestly, clone exists because IDEs have it. The user already has `git clone` and
`gh repo clone`. The Tortie specific gain is roughly fifteen seconds and one context switch.
The reference screen this was drawn from is Cursor's, and Cursor's is drawn from VS Code's,
which is the exact provenance the guardrail was written to catch. Every clone feature in every
editor is the same feature, and none of them is why anyone would use Tortie.

So the size is set by that argument. Build the smallest clone that cannot lie, which is the
dialog, the preflight, the phase words, cancel and the ten error messages. Nothing else.

### 5.11 The mark contrast finding

**Reduced from a blocker to a brand item.** The measurement stands and its severity was
overstated. WCAG 1.4.11 exempts a logotype from the 3:1 floor, the wordmark beside the mark
carries the name as real text, and the 85.8 percent figure counts the interior of an outline
drawing. Section 1.7 has the ruling and keeps the recommended fix as brand work rather than as
a gate on Phase 18.6.

### 5.12 The wordmark question

**Not resolved. It goes to the operator.** Section 7 states both positions and the
recommendation, and the domain check that gates one of them.

---

## 6. The Phase 18.6 backlog entry

Paste the block below into `docs/BACKLOG.md`, as a `## Phase 18.6` section, in the position the
execution order at the top of that file already reserves for it. The heading uses a period where
its sibling headings use an em dash, because the writing rules in CLAUDE.md forbid that character.
Restore the sibling style on paste if the operator prefers the file to look uniform.

---

## Phase 18.6. The home screen, with open, create and clone (2026-08-12)

**Do not start until Phase 18.5 has committed and Phase 18.55 has landed.** Item 5 of 18.5
edits `quickCreate` in `src/renderer/state/store.ts`, and this phase edits `createProject` in
the same file. Phase 19 then waits on this phase, for the reason already recorded at the top of
the backlog.

**Motivation, not a symptom.** Tortie has no home. The state a user sees with no project open is
`FirstRun` in `src/renderer/app/EmptyStates.tsx`, which offers two buttons and names the product
nowhere except in one sentence of body copy. Three things follow from that.

1. The product has no visible name. There is a mark at 44 px with `alt=""` and no wordmark, so
   the one screen with room to say what this is says nothing.
2. Closing your last project deletes its manifest row, so the path is gone and coming back means
   finding the folder in Finder again. `SessionsCore.removeProject` calls
   `manifest.deleteProject(id)`, and there is no recent projects list anywhere in the codebase.
3. Cloning does not exist. There is no verb, no IPC channel and no interface. A grep for "clone"
   across `src` finds only `structuredClone` and comments.

**Specification.** `docs/research/35-home-screen.md`. Read section 5 as well as sections 1 to 4,
because six things in it were cut deliberately and each cut looks like an omission until you
read the reason.

**Reference material, all real paths.**

| Path | What it is |
| --- | --- |
| `docs/research/35-home-screen.md` | The specification. Sections 1 and 2 are the screen, section 3 is the clone, section 4 is the integration map. |
| `docs/ZEN-OF-TORTIE.md` | The authority that rules out the dashboard elements section 5 cut. |
| `DESIGN.md` and `docs/DESIGN-SPEC.md` | The design system. Section 1.2 forbids accent on an icon at rest, section 1.1 gives the hover contrast rule, section 5 forbids motion on app load, and S6 governs the third dialog. |
| `src/renderer/assets/brand/tortie-128.png` | The mark, 128 by 128, RGBA. |
| `/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/ss-home/` | The prototype and five screenshots. **These are session temporary files and may be gone by the time this phase runs.** They also show an earlier draft, which still carries the status dots and the count badge that section 5.1 cuts, and which says "Open a folder..." where section 1.11 says "Open project...". The wireframes in the specification are the authority, not the screenshots. |

**Items.**

1. The home screen module, its CSS and the lockup. Sections 1.1 to 1.8 and 1.11 to 1.14. Two new
   type tokens. `FirstRun` becomes a thin wrapper.
2. The recents store, which is a JSON file at `<userData>/recents.json` owned by main, plus
   `File > Open Recent`. Section 4.2. Not a manifest migration.
3. The recents list on the screen, with no status dot and no count badge, including the missing
   folder treatment. Section 1.9.
4. The third project verb everywhere, which is the home row, the `+` menu and the File menu.
   Section 1.8.
5. The clone plumbing, which is `src/main/projects/clone.ts`, the three `projects:*` channels and
   the preload subscription. Sections 3.3 to 3.9 and 3.14.
6. The clone dialog, its progress display and its ten failure messages. Sections 3.10 to 3.13.

**Verification, per item at its own tier.**

| Item | Tier | What the evidence must be |
| --- | --- | --- |
| 1, the screen and the lockup | Tier 1 | Gates, plus a screenshot read at 1440 by 900 and at 960 by 600. Confirm the mark and the actions sit at the same y with and without recents. |
| 2, the recents store | Tier 2 | Gates, plus a probe that opens two projects, closes both, quits, relaunches and reads the file. Confirm a corrupt file yields an empty list rather than a boot failure. |
| 3, the recents list | Tier 2 | Gates, plus a screenshot read, plus one probe with a deleted folder. |
| 4, the third verb | Tier 1 | Gates, plus a screenshot of the `+` menu and the File menu. |
| 5, the clone plumbing | **Tier 3** | It writes to the filesystem and it can leave a partial directory behind, which is the data loss case. Drive the real application. Clone a public repository. Cancel one mid transfer and assert with `ls` that neither the temporary directory nor the target exists, and with `ps` that no `git-remote-https` and no `index-pack` survive. Quit the application mid clone and assert the same. Then the credential case, which is the one that hangs: run a private repository clone from a `npm run dev` launch, which has a controlling terminal, and assert it fails in under a second rather than blocking. |
| 6, the clone dialog | Tier 2 | Gates, plus a screenshot read of the running state and of two failures. Assert that the progress bar resets when the phase word changes, and that no overall percentage is displayed anywhere. |

**What must not regress.**

- The 44 live tmux sessions and their pane geometry. Nothing in this phase touches tmux, and
  that is the point.
- `NoSessions` and `TmuxMissing`, which share the `.empty` skeleton and `.onb-inner` with the
  screen being replaced. Do not widen `.onb-inner` from 660 px.
- The whole window folder drop, which still opens a dropped folder as a project.
- `#O` and `^#N`, which are already global.
- The New Project dialog and its focus handoff to the fleet, which the clone dialog copies and
  which must keep working itself.
- Phase 18's layout work and Phase 18.5's store edits, both of which are days old in
  `src/renderer/state/store.ts`.
- The frozen `projects:*` channels and the `GmuxErrorPayload` union in `src/shared/types.ts`,
  neither of which this phase changes.

**Two things need the operator before the phase starts.** Both are in section 7 of the research
document. The first is the wordmark, and it gates the copy. The second is whether rewriting a
pasted SSH URL to https is the right reading of "SSH is out of scope".

---

## 7. Open questions for the operator

**1. The wordmark, and it gates the screen's copy.**

The brief asks for the words `Tortie.sh`. Checked today, `tortie.sh` is registered and pointed
at Vercel, its HTTPS handshake fails because no certificate is served, and plain HTTP returns
404. So printing it in the window advertises an address that serves nothing. There is a second
cost, which is that the bundle is `com.specstory.tortie`, and the menu bar, the About panel and
the DMG all say Tortie. Adding `Tortie.sh` gives the product two names in one session.

| Position | What ships | What it costs |
| --- | --- | --- |
| (a) The application is Tortie. The window says `TORTIE`. The domain is marketing and lives on the website. | `TORTIE` alone | Nothing. This is the recommendation if the site is not close. |
| (b) The product's public name is `Tortie.sh`. | `TORTIE.sh`, with `.sh` lowercase per section 1.6 | The site must resolve before this ships, and someone should decide whether About and the DMG follow. |

Either way the casing is settled. If the answer is (b), it is `TORTIE` in caps with `.sh` in
lowercase, and the measurement in section 1.6 is why. The difference between the two is one
span in one file, so the decision can be made late, but it cannot be made after the screen
ships.

**2. Is rewriting a pasted SSH URL to https the right reading of "SSH is out of scope"?**

The reading taken here is that it means do not implement the SSH transport, and not reject a
pasted SSH address. A person who pastes `git@github.com:owner/repo.git` gets an https clone and
one line saying so. The alternative is to refuse the address, which is a worse experience for
someone who pasted a real repository. Confirm the reading, because rule 3 in section 3.4
depends on it.

**3. Does the brand package get a dark ground mark variant?**

This is no longer a gate on Phase 18.6, for the reason in section 5.11. The question is whether
it is worth making, and the answer only affects how the mark looks at 48 px. The requirement, if
it is made, is one line. Every opaque pixel must measure at least 3:1 against `#131417`.

---

## 8. What is not true

- **Nothing here is built.** No file under `src` was changed and no package was installed.
- **The prototype is not the application.** The screenshots come from a static HTML file
  rendered in Chromium. It uses the real token values and the real mark, and it is not React,
  it is not Electron, and its icons are placeholders for codicons.
- **The screenshots are stale in two ways.** They still show the status dot and the count badge
  that section 5.1 cuts, and they say "Open a folder..." where section 1.11 says "Open
  project...". The wireframes in section 1 are the specification.
- **The scratchpad is session temporary.** Every path under `/private/tmp/claude-501/` may be
  gone when Phase 18.6 runs. Nothing in the specification depends on those files.
- **The clone dialog was never prototyped.** Only the home screen was rendered. The dialog's
  geometry is inherited from a shipped dialog, which is why it is specified in plain text
  drawings rather than mocked.
- **No user has seen any of this.** There is no user research, no testing and no feedback behind
  it. Every decision rests on the Zen, on DESIGN.md, on what was measured in the codebase, and
  on the argument written beside it.
- **Section 3.16 lists what was not verified in the clone work**, and it is the list a builder
  should read before trusting a number.
- **The recents list has no storage today.** If item 2 of the phase does not land, the home
  screen still works and always shows its first launch state.

---

## 9. Files referenced

| Path | What it is |
| --- | --- |
| `docs/research/35-home-screen.md` | This document. |
| `.../scratchpad/ss-home/proto.html` | The prototype, with the wide, narrow and first launch states. |
| `.../scratchpad/ss-home/mark.html` | The wordmark and mark study. |
| `.../scratchpad/ss-home/tortie-ondark-128.png` | The lifted mark proof, which is a proof and not an asset. |
| `.../scratchpad/ss-home/shot-home-wide-1440x900.png` | The wide state, stale per section 8. |
| `.../scratchpad/ss-home/shot-home-narrow-960x600.png` | The minimum window, stale per section 8. |
| `.../scratchpad/ss-home/shot-home-firstrun-1440x900.png` | The first ever launch, stale per section 8. |
| `.../scratchpad/ss-home/shot-wordmark-study.png` | Six wordmark treatments compared at 1x. |
| `.../scratchpad/ss-home/shot-mark-brightness-filter.png` | The rejected CSS filter, compared at four factors. |
| `.../scratchpad/clone-research/ref.mjs` | A working reference implementation of the clone runner, the parser, the temporary directory and the rename. |

The scratchpad root is
`/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad`.
