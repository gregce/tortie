# Phase 317 — End from the phone: his checklist

For the ONE TestFlight build after Phase 318 lands (build/p317/SPEC.md §9). Each row says what to open, what to
press and what you should see. The words in quotes are the words on the screen, and the table at the foot says the
file each one was found in on the tree this was written against, so a word that moves is found again.

You need: your Mac running Tortie from main after 318 has landed, and your iPhone with the new TestFlight build
installed and paired.

## The rows

1. **The Mac.** Open Tortie, then **Settings then Phone**.
   **You should see** the door asking you to allow it again, with the lines
   `Answers these and nothing else: blocked, end, pair, session, turns` (318 adds `choose` and `say` to that
   line) and `Lets an allowed phone end a session`.
   Press **Allow**.

2. **The build.** The archive and upload row is the combined checklist's (build/p316/CHECKLIST.md). This build
   carries 317.

3. **One End, cancelled.** On the Mac, start a scratch shell session. On the iPhone, open that session.
   **You should see** `End session…` in a bar above the tab bar, with the Face ID mark beside it (a picture, no
   word). Press it. **You should see** the sheet read `End '<the session's name>'?`, under it the same sentence your
   Mac shows when you end that session there, and the press `End session`.
   Press `End session`. The first time, iOS asks whether Tortie may use Face ID: allow it.
   Then, when Face ID looks for you, **look away, then press Cancel**.
   **You should see** `Not confirmed. Nothing was changed.` under the bar, and on the Mac the session still runs.

4. **One End.** Press `End session…` again, then `End session`, and let Face ID see you.
   **You should see** the session read Ended on the phone, the bar gone, and the session Ended in Manage Sessions
   on the Mac.

5. **End these.** On the Mac, start two scratch shell sessions. On the iPhone, open the **Sessions** tab and press
   **Select**. Tick both. Press `End selected sessions…`.
   **You should see** the sheet read `End 2 running sessions?`, then the Mac's own sentence about what ending
   does, then the two names. Press `End 2 sessions` and let Face ID see you.
   **You should see** `Ended` beside each, and `2 of 2 sessions ended`. Press **Done**.

6. **Unpair, as before this phase.** On the iPhone, open **Settings**, press **Unpair this iPhone**, then **Unpair**.
   **You should see** the Pairing screen at once, asking nothing of Face ID. On the Mac, **Settings then Phone**
   still lists this iPhone, as the question said it would: press **Remove** for its row, then **Pair** and scan the
   new code with the iPhone. (Phase 317's fix round took out the Unpair that asked the Mac first: with the Mac not
   answering, it kept the phone waiting about five seconds where it used to land at once.)

## Not covered yet

- A Touch ID iPhone and an iPad (Phase 333.4's devices): the mark, the prompt, and that no word says Face ID.
- An iPhone with no passcode: the Simulator's E3 proves the bar is drawn off with
  `Set a passcode on this iPhone to end a session from it.`, and no phone of yours has been tried that way.
- An iPhone with Face ID turned off for Tortie, or with no face enrolled: the bar should show the lock, not the Face
  ID mark, and the press should ask for your passcode (the fix round's change, unit tested and not yet seen on a
  phone of yours).
- Reply (Phase 318).
- Ending a session on another machine from your own phone (probe:p317's W5 ends one on a loopback machine).

## Where every word was found

Read on the tree at `/private/tmp/wt-p317` on 2026-10-01 (`551312f7` with 317's changes on top). The line numbers
move; the file and the name do not.

| Word on the screen | Where it is | Name there |
| --- | --- | --- |
| `Answers these and nothing else: blocked, end, pair, session, turns` | `src/main/pocket/pairing.ts:427` | `describePocketDoor`, the route line, over the hashed route list |
| `Lets an allowed phone end a session` | `src/main/pocket/pairing.ts:432` (`:408` `end: 'end a session'`) | `describePocketDoor`'s write line, from `WRITE_CLAUSES` |
| **Allow** (the Mac's sheet) | `src/renderer/settings/PhoneSection.tsx:74` | `BTN_ALLOW` |
| **Settings then Phone** | `src/main/settings/window.ts:65`, `src/renderer/settings/PhoneSection.tsx:68` | `title: 'Settings'`, `PHONE_TITLE` |
| `End session…` (the phone's bar) | `ios/Tortie/Style/Copy.swift:342`, the Mac's `src/renderer/session-manager/copy.ts:202` | `Copy.endSessionMenu`, pinned to `END_SESSION` |
| `End '<name>'?` | `src/shared/lifecycle-words.ts:120` | `endSessionConfirm`'s title, sent by the door as `endConfirm` |
| The sentence under it | `src/shared/lifecycle-words.ts:116` to `:128` | `endSessionConfirm`'s body, the one your Mac shows for that session |
| `End session` (the press) | `src/shared/lifecycle-words.ts:127` | `endSessionConfirm`'s `confirmLabel` |
| iOS's Face ID question | iOS's own words; the reason under it is `ios/Tortie/Info.plist:28` | `NSFaceIDUsageDescription`: `Tortie asks for Face ID before it ends a session on your Mac.` |
| `Not confirmed. Nothing was changed.` | `ios/Tortie/Style/Copy.swift:440` | `Copy.endNotConfirmed` |
| `Ended` | `ios/Tortie/Style/Copy.swift:416`, the Mac's `src/renderer/session-manager/copy.ts` `batchOutcomeWord` | `Copy.ended` |
| **Select** | `ios/Tortie/Style/Copy.swift:347` | `Copy.select` (the phone's own word) |
| `End selected sessions…` | `ios/Tortie/Style/Copy.swift:350`, the Mac's `src/renderer/session-manager/copy.ts:137` | `Copy.endSelected`, pinned to `END_SELECTED` |
| `End 2 running sessions?` | `src/renderer/session-manager/copy.ts:692` | `batchHeading`, composed on the phone from its pinned pieces |
| The sentence about what ending does | `src/renderer/session-manager/copy.ts` `batchBody` | `batchBody(false)`, `Copy.batchBodyLocal` |
| `End 2 sessions` | `src/renderer/session-manager/copy.ts:696` | `batchConfirmLabel` |
| `2 of 2 sessions ended` | `src/renderer/session-manager/copy.ts:744` | `batchDoneHeading` |
| **Done** | `src/renderer/session-manager/copy.ts` `BATCH_DONE` | `Copy.done` |
| **Unpair this iPhone**, **Unpair** | `ios/Tortie/Style/Copy.swift:298`, `:312` | `Copy.unpairThisIPhone`, `Copy.unpair` |
| `It forgets this Mac and its keys. Your Mac lists this iPhone until you press Remove in Settings then Phone.` | `ios/Tortie/Style/Copy.swift:309` | `Copy.unpairNote`, its three `/// Names:` pins on the Mac's Remove, Settings and Phone |
| **Remove** (the Mac's row) | `src/renderer/settings/PhoneSection.tsx:206` | `BTN_REMOVE` |
| `Set a passcode on this iPhone to end a session from it.` | `ios/Tortie/Style/Copy.swift:444` | `Copy.endNeedsPasscode` |
| **Pair a Phone…** (still under Settings… in the menu) | `src/main/menu.ts:615` | unchanged by this phase |
