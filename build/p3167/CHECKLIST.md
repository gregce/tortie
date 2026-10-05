# Phase 316.7 — the phone's Sessions tab: his checklist

For the ONE TestFlight build after every phone phase lands (his ruling of 2026-09-30; build/p3167/SPEC.md §10). Each
row says what to open, what to press and what you should see. The words in quotes are the words on the screen, and
the table at the foot says the file each one was found in on the tree this was written against, so a word that moves
is found again. This phase does not move the build number: the main session numbers the one archive.

You need: your Mac running Tortie from main after this phase has landed, with a few sessions in two or more projects
and at least one ended session, and your iPhone with the new TestFlight build installed and paired.

## The rows

1. **The Mac.** Open Tortie, then **Settings then Phone**.
   **You should see** the door asking you to allow it again, because what it answers has grown: the line
   `Answers these and nothing else: blocked, choose, end, pair, say, session, sessions, turns` (Phase 318's writes landed beside it). Press **Allow**.

2. **The build.** The archive and upload row is the combined checklist's (build/p316/CHECKLIST.md): archive, run
   `node build/p316/test-ios.mjs --read-app` on the archive, upload, and install from TestFlight.

3. **Sessions opens on Active.** On the iPhone, open the **Sessions** tab.
   **You should see** `All`, `Active` and `Ended` under the title with **Active** chosen; your running sessions under
   the name of their project, each project with a count beside it; and no ended session anywhere on the tab. A project
   with a session waiting on you carries the yellow dot on its header. Two projects with the same name show their
   folder under the name.

4. **An old session.** Tap **Ended**.
   **You should see** your ended sessions under their projects. Open one.
   **You should see** its conversation, page back to its first turn, and **no** `End session…` bar: nothing on it acts.
   Go back, and tap **All**.
   **You should see** every project, each with its count. A project whose sessions have all ended starts closed; tap
   its header and its sessions are drawn. Every session the tab drew before this phase is one tap away: on **Active**,
   **Ended** or **All**. For the one list exactly as the tab drew it before this phase (waiting first, then the most
   recent, no headers), choose **Group by** then `None` in the menu (row 5) while **All** is chosen; the phone keeps it.

5. **The menu.** Press the round button with three lines beside **Select** (VoiceOver calls it `Group, sort and
   filter`). Choose **Sort by**, then `Name`. Open it again and choose **Group by**, then `None`. Open it again and
   choose **Agent**, then one agent.
   **You should see** after each choice the list redrawn that way: by name, then with no project headers, then only that
   agent's sessions. The button is filled while the agent filter is on.
   Open the menu and press `Clear filters`.
   **You should see** **All** chosen and every session back, still by name and with no headers.

6. **What the phone remembers.** Quit Tortie on the iPhone (swipe it away) and open it again, then the **Sessions** tab.
   **You should see** Show, Group by and Sort by as you left them in row 5, and **no** agent filter. A project you
   opened or closed is back to how it starts.

7. **Select still ends sessions.** On the Mac, start two scratch shell sessions. On the iPhone, on the **Sessions** tab
   with **Active** chosen, press **Select**, tick both, and press `End selected sessions…`, then the press that ends
   them, and let Face ID see you.
   **You should see** `Ended` beside each. Pull the list down before you press **Done**.
   **You should see** both rows still there with `Ended` beside them. Press **Done**.
   **You should see** both gone from **Active**.

8. **The Needs input tab is as it was.** Open **Needs input**.
   **You should see** the sessions waiting on you, and the tab's badge their number, exactly as before this phase.

## Not covered yet

- Search: there is no search box, by design (SPEC D14). Its own entry, if he asks.
- Removed sessions (Past Sessions): they stay off the phone.
- More than 2,000 sessions: the Simulator's hostile door draws the cap and its `n more not shown.` lines
  (probe:p316's `sessions-cap`), and no phone of his holds that many.
- A machine whose id is `local`: the Mac's own residual (SPEC §14 item 5), drawn on the phone as the Mac's sheet draws it.

## Where every word was found

Read on the tree at `/private/tmp/wt-p3167` on 2026-10-02 (`c1a5fd38` with 316.7's changes on top). The line numbers
move; the file and the name do not.

| Word on the screen | Where it is | Name there |
| --- | --- | --- |
| `Answers these and nothing else: blocked, choose, end, pair, say, session, sessions, turns` | `src/main/pocket/pairing.ts` | `describePocketDoor`, the route line over the hashed route list |
| **Allow** (the Mac's sheet) | `src/renderer/settings/PhoneSection.tsx` | `BTN_ALLOW` |
| **Sessions** | `ios/Tortie/Style/Copy.swift` | `Copy.sessions` |
| `All`, `Active`, `Ended` | `ios/Tortie/Style/Copy.swift`, the Mac's `src/renderer/session-manager/copy.ts` | `Copy.showAll`, `Copy.showActive`, `Copy.ended`, pinned to the sheet's lifecycle labels |
| the project's count, its folder, the waiting dot | the door's answer, `src/main/pocket/routes.ts` | `sessions()`'s `groups` (`count`, `folder`, `waiting`) |
| `Group, sort and filter` (VoiceOver's name for the menu) | `ios/Tortie/Style/Copy.swift` | `Copy.sessionsOptions` |
| **Group by**, `Project`, `None` | `ios/Tortie/Style/Copy.swift` | `Copy.groupBy`, `Copy.groupProject`, `Copy.groupNone` |
| **Sort by**, `Recent activity`, `Name`, `Oldest first` | `ios/Tortie/Style/Copy.swift` | `Copy.sortBy`, `Copy.sortRecent`, `Copy.sortName`, `Copy.sortOldest` |
| **Agent**, `All agents` | `ios/Tortie/Style/Copy.swift` | `Copy.agent`, `Copy.allAgents` |
| **Machine**, `All machines`, `This Mac` | `ios/Tortie/Style/Copy.swift` | `Copy.machine`, `Copy.allMachines`, `Copy.thisMac` |
| `Clear filters` | `ios/Tortie/Style/Copy.swift`, the Mac's `src/renderer/session-manager/copy.ts` | `Copy.clearFilters`, pinned to `CLEAR_FILTERS` |
| `No matching sessions` | `ios/Tortie/Style/Copy.swift`, the Mac's `src/renderer/session-manager/copy.ts` | `Copy.noMatchingSessions`, pinned to `NO_MATCH_HEADING` |
| `3d old` (an age from a session's creation) | `src/shared/age.ts` | `createdOld` |
| `n more not shown.` | `ios/Tortie/Style/Copy.swift` | `Copy.othersOmitted`, `Copy.othersOmittedTail` |
| **Select**, `End selected sessions…`, `Ended`, **Done** | `ios/Tortie/Style/Copy.swift` | `Copy.select`, `Copy.endSelected`, `Copy.ended`, `Copy.done` (Phase 317's) |
| **Needs input** | `ios/Tortie/Style/Copy.swift` | `Copy.needsInput` |
