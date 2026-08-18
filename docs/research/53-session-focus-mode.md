# 53. Session focus mode

**Status.** Research only, requested by the operator on 2026-08-17. The single
deliverable is this document. It changes no code. The operator decides what, if
anything, becomes a build phase.

**Method.** The current chrome, fill, zoom, split and motion rules were read
from the tree. Four motion engines and four product shapes were compared. Each
was attacked against DESIGN.md section 5, against the live terminal resize
rule, and against the Phase 23 refusals. Numbers that come from this tree are
named as such. Numbers that come from vendor pages are dated 2026-08-17.

---

## 0. The answer

Build an in-window session focus mode. Do not send the window into macOS full
screen. Do not add an animation library.

A keystroke grows the active **surface** (one session, or a split group of
up to six) until it fills the window. The title bar, activity bar, sidebar,
editor and session strip recede. A soft wash in the session's status colour
fills the space they leave. After at most 200 ms the live terminals sit at
their final size and take one resize. Escape, the same keystroke, or a View
menu item leaves the mode and puts every region back exactly as it was.

The mechanism is a First Last Invert Play flight on a still copy of the
surface, then one swap to the live xterm hosts. The motion engine is the Web
Animations API that Chromium already ships. Duration is `--dur-panel`
(200 ms). Easing is `--ease-out`. Nothing animates the live terminal's layout
box while it is attached.

That last sentence is the whole design. DESIGN.md section 5 forbids animation
over live output. `work-area.css` forbids width transitions because every
animated frame is a ResizeObserver fit and every fit is a tmux resize. Editor
fill already hides chrome without a flight. This mode is that same memento,
plus one authored 200 ms grow.

| Question | Decision | Deciding reason |
|---|---|---|
| Product | In-window focus of the active surface | Window full screen already exists and still shows chrome |
| Unit | The surface, including every split leaf | A split group is one thing the user is in |
| Engine | Web Animations API, no new package | One authored motion. A library adds weight and a license for a 200 ms tween |
| Flight | Still copy, then one live swap | Transforming a live WebGL terminal would either blur glyphs or spam tmux |
| Glow | Status wash on vacated chrome, never a halo on the terminal | Colour is for state. DESIGN.md forbids zero-offset halos |
| Persist | Never | Editor fill already proved a mode you cannot see the exit from at launch is a trap |
| Window full screen | Unchanged, separate | Control-Command-F already owns that. Mixing the two would double the menu row work Phase 62.1 just finished |
| DESIGN.md section 5 | Name this as a second authored moment, still 200 ms | The pulse is perpetual. This is a state change. Both stay inside `--dur-panel` |

---

## 1. What the operator asked for

Quoted from the request, then restated as a product sentence.

> A graphically amazing focus / zen mode for the session window. A keystroke
> would beautifully animate with subtlety and zoom in with relevant background
> glow. Right now you can full screen the Tortie window but not the session
> pane. There is still app chrome around it, which is good, but it should have
> amazing Mac-like dynamics that allow you to zoom into the flow and only see
> the session you have, especially amazing if you have multiplexed.

The product sentence.

A person who is in a session, or in a split group of sessions, presses one
chord. The rest of Tortie recedes. Only that work remains, grown to the
window, with a quiet status-coloured wash where the chrome was. The same
chord brings the chrome back. Sessions keep running. The window is still one
window. Nothing about durability moves.

What is already good and must stay.

- Window full screen, Control-Command-F, one macOS row named Enter Full
  Screen. Measured in Phase 62.1. Do not add a second visible row.
- Editor fill, Shift-Command-B. Puts the sidebar and session dock away so a
  **file** has the work row. Writes nothing. Leaving restores the prior
  layout.
- Per-region zoom. Command-Plus changes the font of the focused terminal. It
  does not hide chrome.
- Hidden sessions cost no xterm and no attach PTY.

What is missing.

There is no way to give a **session** (or a split group) the whole window
with a flight that reads as one gesture. Editor fill is the sibling for
files, and it has no flight. Window full screen is the sibling for the
application, and it keeps every region.

---

## 2. What already exists

| Surface | Chord | What it does | What it is not |
|---|---|---|---|
| Window full screen | Control-Command-F | Grows the BrowserWindow. Chrome stays | Not session focus |
| Editor fill | Shift-Command-B | Hides sidebar and dock. File takes the work row. Instant. Not persisted | Not for sessions. No motion |
| Sidebar toggle | Command-B | Hides the sidebar. Activity bar stays | Session strip and editor remain |
| Terminal zoom | Command-Plus / Minus | Changes xterm font size | Chrome stays. Layout box stays |
| Attention overlay | Command-J | Lists sessions that need input | A dashboard, not a zoom |
| Split group | Drag | Up to 6 leaves in one surface | Layout is presentation only. Each leaf is its own tmux session |

Editor fill is the memento to copy.

```text
enter
  remember sidebarVisible and dockCollapsed
  hide both
  do not write those values as the new preference
leave
  replay the memento
  or, if the user moved a divider or pressed Command-B, drop the memento
      and keep what is on screen
boot
  memento is always null
```

Focus mode needs the same shape, with two more remembered facts: whether the
editor panel was open, and whether the session strip or dock was showing.

The live terminal rule, from `src/renderer/app/work-area.css` and DESIGN.md
section 5.

> No width transitions. Every animated frame of a resize is a ResizeObserver
> fit, and every fit pushes new cols and rows to real sessions. The terminal
> region never animates. No fades over live output.

That rule is load bearing. A beautiful flight that resizes xterm for 12 frames
will reflow every agent in the group twelve times. That is how you get a
session that looks drunk and a tmux server that is busy.

---

## 3. What the mode is, in product words

**Name.** Focus. Not Zen, not Theatre, not Distraction free. Zen is the
product philosophy. Focus is the verb.

**Subject.** The active surface of the active project. A surface is one
session, or one split group. It is never one leaf pulled out of a group, and
it is never every session in the project.

**Enter.** One chord, one View menu item, one no-op when there is no live
surface (no project, no session, or the selected session is restorable and
showing the Restore card).

**During.**

- Title bar project tabs, activity bar, sidebar, editor and session strip or
  dock are gone.
- Traffic lights stay. `titleBarStyle` is `hiddenInset`. They sit on the
  session the way they sit on a native full screen document.
- Split headers stay if the surface has two or more leaves. Without them the
  group cannot be told apart.
- Status wash occupies the vacated chrome. Amber if any visible leaf needs
  input. Accent wash if any visible leaf is working. Idle wash otherwise.
- The 1 Hz activity poll keeps running. A leaf that starts to need input
  still pulses its header dot. Command-J still opens the attention overlay
  on top of focus.
- Hidden sessions stay hidden. No extra PTY.

**Leave.** The same chord, Escape (only when no modal is above), or the View
menu item. The memento replays. If the user showed the sidebar or opened a
file during focus, drop the memento and keep that choice, the same as editor
fill.

**Never persist.** A launch always shows the ordinary chrome.

**Does not change.** Session status rules. tmux. The manifest. Attach of
hidden sessions. Window full screen.

---

## 4. Mechanism options

How the rectangle grows. This is the decision that decides whether the mode
is calm or harmful.

| Option | How it works | Verdict | Deciding reason |
|---|---|---|---|
| A. Instant hide, no flight | Same as editor fill. Chrome vanishes. Surface snaps to the window. One resize | Reject as the only behaviour | The operator asked for a flight. Keep it as the reduced-motion path |
| B. Animate chrome width and height | Transition the flex sizes of sidebar, dock and editor | Refuse | Forbidden by DESIGN.md section 5 and `work-area.css`. Each frame is a tmux resize |
| C. CSS transform on the live host | `scale` and `translate` the live TerminalPane without changing its layout size, then snap to the final size | Refuse | WebGL glyph atlases go soft under scale. Fit still fires when the final size lands if you are not careful. Fine for a still image, wrong for a live terminal |
| D. Still copy, then one live swap | Photograph the surface. Fly the photograph. Hide chrome. Size the live host once. Swap | **Build this** | The flight never touches a live layout box. One resize at the end. Splits fly as one picture |
| E. View Transitions API on the live tree | `document.startViewTransition` between the two layouts | Reject as the primary path | Chromium snapshots the old and new trees. A WebGL canvas often snapshots as an empty or stale frame. Unverified in this app, and the failure mode is a blank flight |
| F. Electron `setFullScreen` on the same window | Call the existing window full screen | Refuse | Chrome stays. Phase 62.1 spent a phase making that menu row singular. This is a different verb |
| G. A second BrowserWindow | Tear the surface into its own window | Refuse | One window is the product. A second window is a second attach, a second WebGL context, and a session that now lives in two places |

### 4.1 How option D works

```text
enter
  1. Read the surface rectangle in window coordinates
  2. Draw a still copy (canvas 2D from each visible xterm, or one
     html2canvas-free path: each WebGL canvas.captureStream / drawImage)
  3. Place the copy in a top layer at the start rectangle
  4. Hide chrome with no width transition (display or a class that
     removes the regions, the way editor fill already does)
  5. Read the destination rectangle (the window content under the
     traffic lights)
  6. Animate the copy from start to destination in 200 ms, --ease-out
  7. Show the live surface at the destination size
  8. One fit, one sessions.resize per visible leaf
  9. Remove the copy

leave
  The reverse. Photograph. Restore chrome. Fly back. One fit.
```

`HTMLCanvasElement.drawImage` can copy a WebGL canvas if the context was
created with `preserveDrawingBuffer: true`, or if the copy is taken in the
same frame as a draw. xterm's WebGL addon does not promise
`preserveDrawingBuffer`. The build phase must measure one copy on a live
pane. If the copy is empty, the fallback is option A for that enter, not a
retry loop.

`prefers-reduced-motion: reduce` takes option A always.

### 4.2 Attack on option D

A still copy freezes agent output for 200 ms. An agent that prints a line
during the flight will pop that line in at the swap. That is honest and
brief. Do not try to keep the copy live. A live copy is option C again.

A split of six leaves means six WebGL canvases. One composite copy of the
surface element (the SplitSurface host) is better than six. Measure
`drawImage` of the host first. If the host is not a canvas, snapshot each
leaf and composite in document order, including the 24 px headers.

A high-DPI display must use `devicePixelRatio` on the copy. A 1x copy
scaled up is the one thing that would make the flight look cheap.

The traffic lights must not jump. Keep the 38 px title bar band as an empty
inset, or keep the title bar itself with no project tabs. Jumping lights are
worse than a 38 px empty strip. The build should prefer an empty title bar
band with the lights in their inset position.

---

## 5. Motion engine options

What code runs the 200 ms tween.

| Option | License and cost | Verdict | Deciding reason |
|---|---|---|---|
| Web Animations API | In Chromium. Electron 43 already has it. Zero bytes | **Use this** | One tween of translate, scale and opacity. The platform already does it |
| CSS transitions on the copy | Zero bytes | Acceptable twin | Same motion. WAAPI is easier to cancel on a second keypress |
| View Transitions API | In Chrome 111 and later. Electron 43 is Chromium 140-class | Not the primary path | Good for chrome fade. Bad as the only tool, because of the WebGL snapshot risk in section 4 |
| Motion (the MIT library formerly called Framer Motion) | MIT. About 132 KB minified in one 2026 comparison page | Reject | Adds a React animation runtime for one gesture. Layout animation is its strength and is exactly what we must not do to a live terminal |
| anime.js | MIT. About 115 KB | Reject | Fine tweening. We do not need a second tweener |
| GSAP 3.13 | Webflow standard license, no charge. About 73 KB. Closed source. Webflow may terminate the license if terms are broken. The license also lets Webflow change terms later | Refuse | A closed license that another company can end is the wrong home for a 200 ms tween. Tortie already refuses to take a dependency that can become a problem later |

No new npm package.

Motion tokens already exist.

```text
--dur-fast:  120ms
--dur-base:  160ms
--dur-panel: 200ms
--ease-out:  cubic-bezier(0.2, 0, 0, 1)
```

DESIGN.md section 5 says nothing exceeds 250 ms. `--dur-panel` is the slot
this gesture belongs in. A longer cinematic zoom would look more like a
product launch and less like Tortie. The Mac feeling comes from the easing
and from flying the real rectangle, not from lasting longer.

Section 5 also says the needs-input pulse is the one authored moment. A
build that lands this mode must add one sentence there. Focus enter and
leave are a second authored moment. They are a state change, they last
200 ms, and they do not run on load.

---

## 6. Glow options

The operator asked for a relevant background glow. Colour in Tortie is for
state, not for decoration. Shadows must carry offset and blur. Zero-offset
halos are banned.

| Option | What the person sees | Verdict | Deciding reason |
|---|---|---|---|
| Status wash on vacated chrome | The space the sidebar and strip left behind fills with `--status-attention` wash, `--accent-wash`, or a quiet idle wash | **Build this** | The colour means the same thing it means on the dot. It is not painted on the terminal |
| Halo around the grown surface | A blur ring hugging the terminal | Refuse | Zero-offset halo. Competes with live output |
| Agent brand colour | Claude orange, Codex green, and so on | Refuse | Agent icons are monochrome on purpose. Brand colour next to the amber signal was rejected in DESIGN.md |
| Highlight scheme colour | The Phase 62 teal or purple accent | Acceptable as the working wash | `--accent-wash` already follows the scheme. Do not add a second wash |
| No wash | Chrome recedes to `--bg-canvas` only | Fallback | Correct if the wash reads as decoration in screenshots. The build should ship the wash behind a token and be ready to turn the alpha to 0 |

The wash is relevant because it follows the visible leaves.

- Any visible leaf is `needs-input`. Use `--status-attention` at a low alpha,
  in the same family as `--accent-wash` (about 0.14). The pulse stays on the
  header dot, never on the wash.
- Else any visible leaf is working. Use `--accent-wash`.
- Else use a token derived from `--bg-raised` at low alpha, or nothing.

Do not invent a new hue.

---

## 7. Multiplex

The surface is the unit. That is the thing that makes a split group feel
considered rather than like a single pane that forgot its siblings.

| Choice | Verdict | Why |
|---|---|---|
| Fly the whole surface, keep every leaf attached | **Yes** | The user is in that group. Hiding a sibling would detach its PTY and lose the WebGL context for a 200 ms gesture |
| Fly only the focused leaf | No | A four-way split would throw three agents off screen. Leaving focus would then have to put them back. That is a different product |
| Promote the focused leaf to a solo surface for the duration | No | That writes layout. Focus must write nothing, the same as editor fill |
| Hide split headers in focus | No | The only names left would be gone. Headers stay. They are 24 px |
| Let the user split and pop out while focused | Yes, with the fill rule | A new split is a manual layout gesture. Drop the memento. Stay in the large surface. Do not fly again |

A six-leaf group at the end of the flight gets six fits and six resizes, once.
That is the same cost as dragging the window, which already happens.

---

## 8. Chord, menu, and reduced motion

Window full screen is Control-Command-F. It is a hidden menu item plus
macOS's own Enter Full Screen row. That work is closed. Do not put focus on
that chord.

Editor fill is Shift-Command-B.

Shift-Command-C is the documented example of a per-agent hotkey. Do not take
it.

A later build phase picks one free chord and records it in
`src/shared/keymap.ts` only. Candidates to measure against the keymap and
against per-agent recordings on the operator's machine:

| Candidate | Risk |
|---|---|
| Shift-Command-Return | May collide with a send-in-terminal habit. Measure |
| Control-Shift-Return | Likely free. Less discoverable |
| Command-Control-Z | Looks like undo. Bad |
| Command-K then Z | VS Code Zen. Two step. Not how Tortie chords work |

The View menu gets one visible item, for example Focus Session, next to Fill
the Window. The phase brief must say the menu changed.

`prefers-reduced-motion: reduce` skips the flight and does option A.

---

## 9. What a later build phase owns

One phase. Tier 2 for the ordinary enter and leave. Tier 3 only for the
claim that a live multiplexed surface does not receive a resize until the
flight ends.

Files a builder should expect to touch.

- `src/renderer/state/chrome-slice.ts` for the memento
- `src/renderer/app/App.tsx` and the work area for the layer
- A new small module, for example `src/renderer/app/session-focus.ts`, for
  the copy, the flight and the swap
- `src/shared/keymap.ts` and `src/main/menu.ts`
- `DESIGN.md` section 5, one sentence
- Tokens for the wash alpha, if a new token is required

What must not be touched.

- tmux, the manifest, attach of hidden sessions
- Window full screen
- Editor fill's meaning. The two modes can both be on. Focus owns the
  session. Fill owns the file. If both would hide the same chrome, one
  memento stack is enough. Last one in is first one out. The builder writes
  that down and tests it
- Activity status rules

Proof the phase must produce.

1. Enter and leave restore sidebar width, dock width, editor width and
   strip or dock orientation byte for byte, unless the user moved them.
2. During the 200 ms flight, `sessions.resize` is not called. After the
   swap it is called once per visible leaf.
3. A two-leaf split stays two leaves. Both stay attached.
4. A restorable selected session does not enter.
5. Reduced motion is instant.
6. Control-Command-F still toggles window full screen and the View menu
   still has one visible full screen row on a packaged build.
7. A screenshot of enter, of the settled focus, and of leave.

---

## 10. Adversary

**This is just editor fill with a fade.** Editor fill is for a file and has
no flight. This is for a session surface and has a 200 ms grow. If the
flight is cut, the modes collapse and the operator's request is not met.
Keep the flight.

**200 ms is not amazing.** Amazing here is the rectangle of the actual
session travelling to the window, and the wash carrying the session's
state. A 400 ms zoom would break the 250 ms cap and would feel like an
advertisement. If screenshots look cheap, the copy resolution or the easing
is wrong, not the duration.

**A library would look more professional.** Motion and GSAP are built for
layout animation of many elements. We have one element and a rule that
forbids layout animation of the live terminal. A library cannot repeal that
rule. GSAP's license can be changed or ended by Webflow. That is enough to
refuse it even if the tween were better.

**Photographing WebGL will fail.** It might. The build measures it on a live
pane before the flight ships. Empty copy means instant enter, not a retry.
That is already the reduced-motion path.

**Hiding chrome will move the traffic lights.** If it does, the mode is
wrong. Keep the inset band.

**Focus will hide a session that needs input.** Command-J still works. The
wash turns amber. The header dot still pulses. Those three are the same
signals the rest of the app uses. Do not add a fourth.

**This is IDE furniture.** VS Code Zen and Zed Zen hide chrome. They do not
own durable agent sessions. The reason this exists is that a person is in a
named session that will still be there after quit, and they want the rest of
the tool to recede while they answer it. That is the agentic-coding
workflow, not a chrome toggle for its own sake.

**Multiplex should zoom the focused leaf.** Then the other leaves vanish and
their PTYs die for the duration. Coming back would remount them and replay
tmux. That is a hitch on leave. The surface stays the unit.

---

## 11. What is not true

- This document did not implement the mode.
- The WebGL copy path was not measured on a live pane in this pass. The
  build phase measures it.
- No chord is chosen. The keymap must be grepped against the operator's
  recorded per-agent hotkeys at build time.
- Window full screen is not replaced.
- No new dependency is recommended.
- The 416 renderer language chunks and Monaco are unrelated.
- Focus does not change session status and does not pause agents.

---

## 12. Sources in this tree

- DESIGN.md sections 1.10, 2.2, 5 and 7
- `src/renderer/app/work-area.css` (no width transitions)
- `src/renderer/state/chrome-slice.ts` (editor fill memento)
- `src/renderer/editor/EditorPanel.tsx` (`toggleEditorFill`)
- `src/renderer/state/layout.ts` (surface, split group)
- `src/renderer/app/split/SplitSurface.tsx`
- `src/renderer/zoom/store.ts`
- `src/main/menu.ts` (hidden full screen item, Phase 62.1)
- `src/shared/keymap.ts`
- `src/renderer/styles/tokens.css`
- `src/renderer/theme/presets.ts` (Phase 62, what a wash may follow)

Outside the tree, fetched 2026-08-17.

- View Transitions API, Chrome developers and MDN
- GSAP standard no-charge license, gsap.com, last modified 2026-05-30
- Motion versus GSAP licensing note on motion.dev
