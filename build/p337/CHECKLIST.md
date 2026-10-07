# Phases 337 and 337.1 — the Terminal: his checklist for build 7

For the ONE TestFlight build, build 7, after Phase 337.1 lands (build/p3371/SPEC.md §9; Phase 337's rows,
build/p337/SPEC.md §9, kept where they still hold). Each row says what to open, what to press and what you should
see. The words in quotes are the words on the screen, and the table at the foot says the file and the name each one
is found under, so a word that moves is found again with one grep.

You need: your Mac running Tortie from main after 337.1 has landed, Claude Code installed and signed in as you use it
every day, another machine set up in Tortie with a session on it, and your iPhone with build 7 installed and paired.

Row 5 asks Claude Code to run one command, which is one real turn. Say **No** when a question asks for anything but
the command the row names.

## The rows

1. **The Mac.** Open Tortie, then **Settings…** then **Phone**.
   **You should see** the door asking you to allow it again, with the line
   `Answers these and nothing else: blocked, choose, end, keys, pair, say, screen, scrollback, session, sessions, turns`
   and a line ending `…and type into any session as you would at this Mac`, and under them
   `A phone you allow can see what any session’s terminal shows and what it printed before, type into it as you would
   at this Mac, answer a numbered question, send a session one message and end a session.`
   Press **Allow**.

2. **Terminal first.** On the iPhone, tap a running Claude Code session.
   **You should see** its terminal at once, one line under the name with the status in its colour, then
   `Claude Code · <project>`, and a speech-bubble icon then `End` at the top right.
   Pinch the terminal, drag it, and turn the phone sideways.
   **You should see** it grow, move, and fill the wider screen; back on the list it is upright again.

3. **Typing, with no Face ID.** Tap the terminal, type a word, and press **return**.
   **You should see** it reach the session, on the phone and at the Mac, and no Face ID asked.
   Open a shell (it opens on its terminal), type `sleep 100` and press **return**, then press **ctrl** then `c`.
   **You should see** the sleep stop and the shell's prompt come back.

4. **Dictation.** Hold the microphone key of the iPhone's keyboard and dictate a sentence.
   **You should see** it typed once, when you finish, and not word by word.

5. **One key per picture inside a question.** On the Mac, make an empty folder (for example `~/scratch-337`), open it
   in Tortie, start Claude Code there and ask it: `run ls`. On the iPhone, open that session.
   **You should see** the question's options as buttons under the terminal.
   Press **↓** on the key bar twice, quickly.
   **You should see** one move, `Waiting for the terminal to redraw.`, then the next move once the terminal has redrawn.
   Answer the question by pressing **No** under the terminal (Escape works too).
   **You should see** no Face ID asked for the press.

6. **Another machine.** Open a session on your other machine and type into it.
   **You should see** its terminal, with the machine's name beside the status, what you typed reach that machine, and
   your Mac's window for that session keep its size: the phone never resizes a session.

7. **Copy.** On any terminal, long press a row, drag across it, and press **Copy**. Paste into Notes.
   **You should see** that row's text in Notes.

8. **Typing can end a session; End asks.** Open a shell, type `exit` and press **return**.
   **You should see** the session end with no Face ID: `End` asks for Face ID, typing does not, as at your Mac.

9. **Scroll back.** In a session that has printed a lot (a shell after `seq 1 3000` will do), drag down on the
   terminal.
   **You should see** older lines arrive above while the bottom keeps changing, and the lines you are reading stay
   still. Press the arrow at the bottom right (`Back to the live terminal`).
   **You should see** the live terminal again, as it was before you scrolled. Scroll back once more and type a key:
   that brings you back to live too.

10. **Catch Me Up.** On a running session, press the speech bubble.
    **You should see** `Catch Me Up` under the session's name, the conversation, and at the bottom where things stand:
    the status, the question if there is one, and the message box when the session waits at its prompt.
    Press **Back**.
    **You should see** the terminal again.

11. **An ended session.** In **Sessions**, press **All**, then open an ended session.
    **You should see** Catch Me Up, not a terminal: the name with `Catch Me Up` under it and the conversation.

12. **The keyboard.** Tap the terminal, then put the keyboard away with the bar's last key. Long press a row and
    **Copy**. Paste into Notes.
    **You should see** the rows stay where they were when the keyboard went, and that row's text in Notes.

## Not covered yet

- How paging back feels through Funnel: every page is a round trip, and no stand-in can say how long one takes.
- A history past 25,000 lines, which needs a deeper `Scrollback depth` in Tortie's Settings on the Mac.
- An iPad (Phase 333.4).
- How it feels through Funnel in general: Phase 338 is built only if it feels laggy.
- Dictation's own behaviour: no Simulator has a microphone, so row 4 is the only check.
- A hardware keyboard on the iPhone.
- The characters SF Mono lacks: the iPhone draws them from its own fonts, and a unit test measures each one's box,
  but no picture of them is taken.
- A full-screen program that wants the mouse gets no wheel from the phone; its arrows and keys work, and it scrolls
  back nothing (the program covers the history, as at your Mac).
- The one refusal on another machine has the network's one-way time in it: a far agent can draw a question in that
  moment, as it can under the desk's own typing over a far attach.

## Where every word was found

Read on the tree at `/private/tmp/wt-p3371` on 2026-10-06 (`e3837139` with 337.1's changes on top). The line numbers
move; the file and the name do not. A word written by another builder of this phase is named by its file and its
name alone.

| Words on the screen | Where | Name |
| --- | --- | --- |
| `Settings…` | src/main/menu.ts | the app menu's settings item, `label: 'Settings…'` |
| `Phone` | src/renderer/settings/SettingsApp.tsx | the settings list's `{ id: 'phone', label: 'Phone' }` row; the section itself is `PHONE_TITLE` in src/renderer/settings/PhoneSection.tsx |
| `Allow` | src/renderer/settings/PhoneSection.tsx | `BTN_ALLOW` |
| `Answers these and nothing else: …` | src/main/pocket/pairing.ts | `describePocketDoor`, the route line over the hashed `routes` |
| `keys`, `screen`, `scrollback` in that line | src/main/pocket/door/table.ts | the route table's `id: 'keys'`, `id: 'screen'` and `id: 'scrollback'` rows |
| `…and type into any session as you would at this Mac` | src/main/pocket/pairing.ts | `WRITE_CLAUSES.keys`, joined by `clauseListOf` |
| `A phone you allow can see what any session’s terminal shows and what it printed before…` | src/shared/ipc/pocket.ts | `POCKET_DOOR_HONESTY` |
| `Claude Code · <project>` | ios/Tortie/Screens/SessionScreen.swift | `StatusLine`, the agent line `Copy.joined([agentLabel, project])` with `Copy.separator` |
| the speech bubble, named `Catch Me Up` | ios/Tortie/Screens/SessionScreen.swift | `CatchUpItem`, SF Symbols' `text.bubble`, labelled `Copy.catchMeUp` |
| `Catch Me Up` | ios/Tortie/Style/Copy.swift | `Copy.catchMeUp`, the Mac's own `item('Catch Me Up', …` in src/main/menu.ts |
| `End` | ios/Tortie/Style/Copy.swift | `Copy.endTop`, drawn by `EndTopControl` in ios/Tortie/Screens/EndBar.swift |
| `return`, `ctrl`, `esc`, `tab`, `⇧tab` | ios/Tortie/Style/Copy.swift | `Copy.keyReturn`, `Copy.keyCtrl`, `Copy.keyEsc`, `Copy.keyTab`, `Copy.keyBackTab` |
| `Waiting for the terminal to redraw.` | ios/Tortie/Style/Copy.swift | `Copy.screenWaitForRedraw` |
| `Back to the live terminal` | ios/Tortie/Style/Copy.swift | `Copy.backToLive`, the arrow's spoken name |
| `Earlier lines changed on your Mac. Go back to the live terminal to read them again.` | ios/Tortie/Style/Copy.swift | `Copy.scrollbackMoved`, the Mac's own `SCROLLBACK_MOVED` in src/shared/screen-copy.ts |
| `Copy` | ios/Tortie/Style/Copy.swift | `Copy.copy`, the Mac's own `label: 'Copy'` in src/renderer/terminal/terminal-menu.ts |
| `Ended` | ios/Tortie/Style/Copy.swift | `Copy.ended` |
| `All` (Sessions) | ios/Tortie/Style/Copy.swift | `Copy.showAll`, the Sessions tab's Show control (Phase 316.7) |

The mocks that draw rows 2, 5, 7, 9 and 12 are docs/design/phone/Session.html (the terminal at rest with a
question's tray) and docs/design/phone/Screen.html (the terminal with the keyboard up), and Catch Me Up of rows 10
and 11 is docs/design/phone/Conversation.html; `npm run conformance:phonecopy` holds every word they draw to the
files above.
