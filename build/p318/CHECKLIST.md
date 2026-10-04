# Phase 318 — Reply from the phone: his checklist

For the ONE TestFlight build after Phase 318 lands (build/p318/SPEC.md §9). Each row says what to open, what to
press and what you should see. The words in quotes are the words on the screen, and the table at the foot says the
file and the name each one is found under, so a word that moves is found again with one grep.

You need: your Mac running Tortie from main after 318 has landed, Claude Code and Codex installed and signed in as
you use them every day, and your iPhone with the new TestFlight build installed and paired.

Rows 2 and 3 ask an agent to run one command, which is one real turn each. Say **No** when a question asks for
anything but the command the row names.

## The rows

1. **The Mac.** Open Tortie, then **Settings then Phone**.
   **You should see** the door asking you to allow it again, with the lines
   `Answers these and nothing else: blocked, choose, end, pair, say, session, turns` and
   `Lets an allowed phone end a session, answer a numbered question and send a session one message`, and under
   them `A phone you allow can end a session, answer a numbered question and send a session one message. It can
   change nothing else on this Mac.`
   Press **Allow**.

2. **One tap on Claude Code's question.** On the Mac, make an empty folder (for example `~/scratch-318a`), open it
   in Tortie and start Claude Code there. Ask it: `run ls`.
   On the iPhone, open that session from **Needs input**.
   **You should see** the command under the question (`Bash ls`), and each option as a button in Claude Code's own
   words and numbers: `Yes`, the one that gives it more room for this folder, `Yes, and switch to auto mode`, and
   `No`. No `Answer this in the session.` above them, and no message box.
   Tap **Yes**.
   **You should see** no Face ID, no confirmation, and the session move on at once, on the Mac and on the phone:
   it no longer waits, and Claude Code runs `ls`.

3. **One tap on Codex's question.** Make a second empty folder (`~/scratch-318b`), start Codex there, and ask it:
   `run ls`. If Codex runs it without asking (it may, in a folder it trusts), ask it instead for something it must
   ask about, and say **No** to it.
   On the iPhone, open that session.
   **You should see** the command on its own line under the question, as Codex draws it after `$`, and the options
   as buttons: `Yes, proceed`, (for most commands) the one that stops it asking about commands that start the same
   way, and `No, and tell Codex what to do differently`.
   Tap **No, and tell Codex what to do differently**.
   **You should see** the session move on at the Mac, and Codex not run the command.

4. **One message.** When the Claude Code session of row 2 has finished and is waiting at its own empty prompt,
   open it on the iPhone.
   **You should see** a box above the End bar reading `Message this session`, a Send arrow beside it, and
   `Goes to this session as one message.` under it.
   Type `say hello` and press **Send**.
   **You should see** `Sending…` for a moment, then `Sent`, the box empty, and at the Mac your words submitted in
   the session as if you had pasted them there and pressed Return. Claude Code answers them.

5. **Your letters at the Mac are never typed over.** With that session open on the iPhone and the box drawn, type a
   few letters into the session AT THE MAC and do not press Return. Then, without pulling to refresh, type a message
   on the iPhone and press **Send**.
   **You should see** `This session is not ready for a message. Nothing was sent.`, your message still in the box,
   and your letters at the Mac untouched. Pull to refresh: **you should see** no box while your letters are there.
   Delete them at the Mac and pull again: the box comes back.

6. **No box while it works.** Ask Claude Code for something that takes a while (for example `count the lines in
   every file here, slowly`), and open the session on the iPhone while it works.
   **You should see** no message box (your ruling, "Only when idle at its prompt"). When it finishes and waits for
   you again, pull to refresh: the box appears.

## Not covered yet

- Gemini, Qwen, Antigravity, Grok, Cursor, OpenCode and every other agent: their questions are never buttons and
  they never get a message box. The phone draws their options under `Answer this in the session.`
- Claude Code's questions about editing or creating a file: not buttons in this build (only its Bash question was
  measured on a real Claude Code); they read `Answer this in the session.`
- A command that Claude Code or Codex does not show whole (long, on more than one line, or holding a secret): only
  `No` is a button.
- A session on another machine: no buttons and no box.
- An iPad and a Touch ID iPhone (Phase 333.4).
- A Claude Code release after 2.1.287 or a Codex release after 0.160.0 that draws its question or its prompt
  differently: the phone then shows no buttons or no box until the screens are captured again.

## Where every word was found

Read on the tree at `/private/tmp/wt-p318` on 2026-10-02 (`c1a5fd38` with 318's changes on top). The line numbers
move; the file and the name do not. A word written by another builder of this phase is named by its file and its
name alone.

| Word on the screen | Where it is | Name there |
| --- | --- | --- |
| `Answers these and nothing else: blocked, choose, end, pair, say, session, turns` | `src/main/pocket/pairing.ts` | `describePocketDoor`, the route line, over the hashed route list |
| `Lets an allowed phone end a session, answer a numbered question and send a session one message` | `src/main/pocket/pairing.ts` | `describePocketDoor`'s write line, joined from `WRITE_CLAUSES` |
| `A phone you allow can end a session, answer a numbered question and send a session one message. It can change nothing else on this Mac.` | `src/shared/ipc/pocket.ts` | `POCKET_DOOR_HONESTY`, drawn by name in `src/renderer/settings/PhoneSection.tsx` |
| **Allow** (the Mac's sheet) | `src/renderer/settings/PhoneSection.tsx:74` | `BTN_ALLOW` |
| **Settings then Phone** | `src/main/settings/window.ts:65`, `src/renderer/settings/PhoneSection.tsx:68` | `title: 'Settings'`, `PHONE_TITLE` |
| `Bash ls` (the question) | `src/main/activity/question.ts` | `questionFromHookBody`, the tool's name and the command, sent by the door as `question` |
| `Yes`, `No`, and every other option's words | the agent's own screen | read back by `detectDialogRows` (`src/main/activity/screen.ts`) and sent as `choices` |
| Codex's command line | the agent's own `$` row | `readPress` (`src/main/reply/press-shapes.ts`), sent as `reply.command` |
| `Answer this in the session.` | `ios/Tortie/Style/Copy.swift:145`, the Mac's `src/renderer/choice.ts:57` | `Copy.answerInTheSession`, `CHOICE_NOT_PRESSABLE`; main's copy is `REPLY_ANSWER_IN_SESSION` in `src/shared/reply-copy.ts` |
| `Message this session` | `ios/Tortie/Style/Copy.swift` | `Copy.messagePlaceholder` (the phone's own word) |
| The Send arrow's name, `Send` | `ios/Tortie/Style/Copy.swift` | `Copy.send` (the phone's own word) |
| `Goes to this session as one message.` | `ios/Tortie/Style/Copy.swift` | `Copy.oneMessage` (the phone's own word) |
| `Sending…` | `ios/Tortie/Style/Copy.swift` | `Copy.sending` (the phone's own word) |
| `Sent` | `ios/Tortie/Style/Copy.swift` | `Copy.replySent` (the phone's own word) |
| `This session is not ready for a message. Nothing was sent.` | `src/shared/reply-copy.ts` | `REPLY_NOT_READY`, sent by the door as the answer's `sentence` |
| `Your Mac did not answer. This is the session as it reads now.` (if the phone loses the Mac mid-write) | `ios/Tortie/Style/Copy.swift:454` | `Copy.endNoAnswer`, true of any write |
| `Your Mac did not take it. Nothing was sent.` (if the write never left the phone) | `ios/Tortie/Style/Copy.swift` | `Copy.replyNotTaken` (the phone's own word) |
