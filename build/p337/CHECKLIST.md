# Phase 337 — The Screen: his checklist

For the ONE TestFlight build after Phase 337 lands (build/p337/SPEC.md §9). Each row says what to open, what to
press and what you should see. The words in quotes are the words on the screen, and the table at the foot says the
file and the name each one is found under, so a word that moves is found again with one grep.

You need: your Mac running Tortie from main after 337 has landed, Claude Code installed and signed in as you use it
every day, another machine set up in Tortie with a session on it, and your iPhone with the new TestFlight build
installed and paired.

Row 5 asks Claude Code to run one command, which is one real turn. Say **No** when a question asks for anything but
the command the row names.

## The rows

1. **The Mac.** Open Tortie, then **Settings…** then **Phone**.
   **You should see** the door asking you to allow it again, with the line
   `Answers these and nothing else: blocked, choose, end, keys, pair, say, screen, session, sessions, turns` and a
   line ending `…and type into any session as you would at this Mac`, and under them
   `A phone you allow can see what any session’s screen shows and type into it as you would at this Mac, answer a
   numbered question, send a session one message and end a session.`
   Press **Allow**.

2. **The Screen.** On the iPhone, open a running Claude Code session.
   **You should see** `End` at the top right, no bar at the bottom, and a `Screen` row under `Conversation`.
   Open **Screen**.
   **You should see** the session as your Mac shows it, small. Pinch it, drag it, and turn the phone sideways.
   **You should see** it grow, move, and fill the wider screen; back on the session's page it is upright again.

3. **Typing, with no Face ID.** Tap the screen, type a word, and press **return**.
   **You should see** it reach the session, on the phone and at the Mac, and no Face ID asked.
   Open a shell's Screen, type `sleep 100` and press **return**, then press **ctrl** then `c`.
   **You should see** the sleep stop and the shell's prompt come back.

4. **Dictation.** Hold the microphone key of the iPhone's keyboard and dictate a sentence.
   **You should see** it typed once, when you finish, and not word by word.

5. **One key per picture inside a question.** On the Mac, make an empty folder (for example `~/scratch-337`), open it
   in Tortie, start Claude Code there and ask it: `run ls`. On the iPhone, open that session's Screen.
   Press **↓** twice, quickly.
   **You should see** one move, `Waiting for the screen to redraw.`, then the next move once the screen has redrawn.
   Answer the question with **No** (Escape works too).

6. **Another machine.** Open the Screen of a session on your other machine and type into it.
   **You should see** what you typed reach that machine, and your Mac's window for that session keep its size: the
   phone never resizes a session.

7. **Copy.** On any Screen, long press a row, drag across it, and press **Copy**. Paste into Notes.
   **You should see** that row's text in Notes.

8. **Typing can end a session; End asks.** Open a shell's Screen, type `exit` and press **return**.
   **You should see** the session end with no Face ID: `End` asks for Face ID, typing does not, as at your Mac.

## Not covered yet

- How it feels through Funnel: no stand-in can say. Phase 338 is built only if it feels laggy.
- Dictation's own behaviour: no Simulator has a microphone, so row 4 is the only check.
- A hardware keyboard on the iPhone.
- An iPad (Phase 333.4).
- The characters SF Mono lacks: the iPhone draws them from its own fonts, and a unit test measures each one's box,
  but no picture of them is taken.
- A full-screen program that wants the mouse gets no wheel from the phone; its arrows and keys work.
- The one refusal on another machine has the network's one-way time in it: a far agent can draw a question in that
  moment, as it can under the desk's own typing over a far attach.

## Where every word was found

Read on the tree at `/private/tmp/wt-p337` on 2026-10-05 (`aebb4ce9` with 337's changes on top). The line numbers
move; the file and the name do not. A word written by another builder of this phase is named by its file and its
name alone.

| Words on the screen | Where | Name |
| --- | --- | --- |
| `Settings…` | src/main/menu.ts | the app menu's settings item, `label: 'Settings…'` |
| `Phone` | src/renderer/settings/SettingsApp.tsx | the settings list's `{ id: 'phone', label: 'Phone' }` row; the section itself is `PHONE_TITLE` in src/renderer/settings/PhoneSection.tsx |
| `Allow` | src/renderer/settings/PhoneSection.tsx | `BTN_ALLOW` |
| `Answers these and nothing else: …` | src/main/pocket/pairing.ts | `describePocketDoor`, the route line over the hashed `routes` |
| `keys`, `screen` in that line | src/main/pocket/door/table.ts | the route table's `id: 'keys'` and `id: 'screen'` rows |
| `…and type into any session as you would at this Mac` | src/main/pocket/pairing.ts | `WRITE_CLAUSES.keys`, joined by `clauseListOf` |
| `A phone you allow can see what any session’s screen shows…` | src/shared/ipc/pocket.ts | `POCKET_DOOR_HONESTY` |
| `End` | ios/Tortie/Style/Copy.swift | `Copy.endTop`, drawn by `EndTopControl` in ios/Tortie/Screens/EndBar.swift |
| `Conversation` | ios/Tortie/Style/Copy.swift | `Copy.conversation` |
| `Screen` | ios/Tortie/Style/Copy.swift | `Copy.screen` |
| `return`, `ctrl`, `esc`, `tab`, `⇧tab` | ios/Tortie/Style/Copy.swift | `Copy.keyReturn`, `Copy.keyCtrl`, `Copy.keyEsc`, `Copy.keyTab`, `Copy.keyBackTab` |
| `Waiting for the screen to redraw.` | ios/Tortie/Style/Copy.swift | `Copy.screenWaitForRedraw` |
| `Copy` | ios/Tortie/Style/Copy.swift | `Copy.copy`, the Mac's own `label: 'Copy'` in src/renderer/terminal/terminal-menu.ts |
| `Ended` | ios/Tortie/Style/Copy.swift | `Copy.ended` |

The mock that draws rows 2, 5 and 7 is docs/design/phone/Screen.html, and the session's page of row 2 is
docs/design/phone/Session.html; `npm run conformance:phonecopy` holds every word they draw to the files above.
