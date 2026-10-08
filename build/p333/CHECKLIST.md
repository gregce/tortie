# Phase 333.6 — the public beta: your checklist for build 8 and Beta App Review

This takes build 8 from Xcode's Organizer to a build waiting in Apple's Beta App Review, and then to the public
link. Every step that reaches Apple is yours: no agent may sign in to App Store Connect, and the command line
cannot upload for your team (`docs/BACKLOG.md:42305`). Each row says what to open, what to press and what you
should see. The words you paste are in "The texts you paste", each counted against Apple's limit. "If Apple
writes" holds your two replies, written now so that you are not writing them in a hurry.

It follows research 140 §9 as you answered it on 7 October: the Mac release goes out when Apple approves or three
working days after you submit, whichever comes first; build 8 goes to review before See a sample exists; the texts
say "terminal"; and 318.1 waits. Every phone checklist before this one said to upload as TestFlight Internal Only.
For any build that may go to the public, this checklist replaces that step.

The table at the end says where each button, label and limit was checked, and is for the agents rather than for
you.

## Before you start

- **Build 8 is in your Organizer.** Tortie 1.0.0 (8), archived by the main session once Phase 333.1 has landed.
  Its first screen has the three steps and **Scan code**. This checklist archives nothing.
- **tortie.sh/privacy and tortie.sh/support open.** They are Phase 333.5's pages, live since 22:11 EDT on 7 October
  (your word: "publish privacy and support"). Apple requires both, and build 8's Privacy and Support buttons open them.
  tortie.sh/iphone stays unpublished until release day, by your choice. Clip 1 shows the Mac's code face, which says
  "from tortie.sh/iphone", so a reviewer who types it sees "page not found" until then. If you would rather they see
  the holding page, publish it before you submit; it names the Mac version and Apple silicon and links nothing.
- **support@tortie.sh gets mail.** Send it one message from another address and see it arrive. tortie.sh has a
  mail record now (`dig MX tortie.sh` answered `1 smtp.google.com.` at 22:44 EDT); on 6 October it had none.
- **Nothing waits for you to agree.** In App Store Connect, select **Business** at the top of the page, then the
  **Agreements** tab. If any agreement there asks you to agree, read it and agree. The Apple Developer Program
  License Agreement's current revision is dated August 18, 2026. If developer.apple.com/account asks you to
  accept it, accept it there too.
- **The devices line.** Phase 333.4's first pass on build 8 has written the line of the devices and iOS versions
  it tested. It goes into the review notes.
- **The Ita Vero sentence.** Text C and text D say "Tortie belongs to Ita Vero, LLC, his company." Keep it only if
  Ita Vero's written licence to you for the name exists (research 136 §10, path A). If it does not, delete that
  one sentence wherever it appears. Then, before you submit, ask the main session to change the first sentence
  of tortie.sh/privacy, which says Tortie for iPhone and Tortie for Mac "are made by Ita Vero, LLC." The reviewer
  opens that page from row 7, so deleting the sentence from the notes alone leaves the claim in review. The
  pages' "© 2026 Ita Vero, LLC" stays, as you chose on 30 September.

## The checklist

1. **Read the archive before you upload it.** In Xcode, choose **Window > Organizer**, then **Archives**.
   Right-click **Tortie 1.0.0 (8)** and choose **Show in Finder**. In Terminal, in `~/gmux` with 333.1 pulled,
   type `node build/p316/test-ios.mjs --read-app ` with a space at the end. Drag the selected `.xcarchive` from
   Finder onto the Terminal window, then press Return.
   **You should see** one line ending "none links NetworkExtension or TailscaleKit, none carries code coverage,
   no DEBUG seam, and it asks Apple for its alert address". If it prints anything else, do not upload.

2. **Upload it through App Store Connect.** In the Organizer, with the archive selected, press **Distribute
   App**. Choose **App Store Connect**, then press **Distribute**. Apple's Xcode page calls this option
   "TestFlight & App Store"; Xcode 26.3 shows it as **App Store Connect**.
   **Never choose TestFlight Internal Only.** Apple marks a build sent that way as internal, under its build
   number, and it "can only be added to internal tester groups". It can never go to Beta App Review or to
   anyone outside your team, and nothing changes that afterwards.
   **You should see** the upload finish. Apple emails you when it has processed the build. Then, at
   appstoreconnect.apple.com, open **Apps**, then Tortie, then the **TestFlight** tab, and under **Builds**
   click **iOS**.
   **You should see** **1.0.0 (8)**, with nothing under its build number saying it is internal. This option
   lets Xcode change the build number while it uploads. If the build reads any number but 8, stop and tell the
   main session: 8 was already taken.

3. **Answer export compliance.** If build 1.0.0 (8) says **Missing Compliance**, click **Manage** beside it,
   then **Provide Export Compliance Information**, and answer as you did for builds 1 to 7. All of the app's
   encryption is Apple's own: TLS to your Mac, and CryptoKit for pairing. If no documentation is asked for,
   click **Save**. Tortie's `Info.plist` carries no answer on purpose, so you answer on every upload.
   **You should see** Missing Compliance gone from build 8.

4. **Check your internal group.** In the sidebar, under **Internal Testing**, your group (the one builds 1 to 7
   went to) is still there. Apple will not let you make an external group without one. If build 8 is not in
   it, select the group, click **Add Builds**, choose 1.0.0 (8) and click **Next**. Paste text B into **What to
   Test**: every group that has build 8 sees the same words. Then click **Add**.
   **You should see** build 8 in your internal group.

5. **Install build 8 and check it end to end.** On your iPhone, open TestFlight and install Tortie 1.0.0 (8).
   Go through `build/p3331/CHECKLIST.md`, then rows 2 to 12 of `build/p337/CHECKLIST.md`. Row 1 there does
   not apply: build 8 adds nothing your Mac must allow again.
   **You should see** every row as those checklists say. If anything is wrong, stop here: this is the build the
   reviewer gets.

6. **Record the two clips on build 8, and put them online as unlisted links.** Use a scratch project, with
   nothing on screen you would not show a stranger: anyone with a link can watch it.
   - **Clip 1, filmed with a camera.** First, on the phone, open **Settings**, press **Unpair this iPhone**, then
     **Unpair**, and on the Mac, in Settings then Phone, press **Remove** beside this iPhone (the phone's Unpair
     forgets only on the phone). The phone's first screen comes back. Start filming. On the Mac, in Settings then Phone, press
     **Pair** under **Pair your phone**. The Mac shows its code, the phone presses **Scan code** and scans it,
     and you press **Allow** on the Mac. Apple asks for a filmed video, not a screen recording, from an app that
     needs other hardware, and your Mac may count as that.
   - **Clip 2, a screen recording on the iPhone from launch:** open a session's terminal, type a key, answer a
     numbered question, open Catch Me Up, then end a session.

   **You should see** both play from their links in a private browser window, with no sign-in.

7. **Fill in Test Information.** In the TestFlight tab's sidebar, under **Additional**, click **Test
   Information**, and choose English.
   - **Beta App Description:** paste text A.
   - **Feedback Email:** `support@tortie.sh`
   - **Marketing URL:** `https://tortie.sh`
   - **Privacy Policy URL:** `https://tortie.sh/privacy`
   - Leave **Invitation Experience** as it is. It shows screenshots from an approved App Store version, and
     Tortie has none yet.

   In the review section of the same page:
   - Your first name, your last name, a phone number that starts with + and the country code, and
     `support@tortie.sh` as the email.
   - Leave **Sign-in required** off. The app has no account.
   - **Notes:** paste text C, then fill in its placeholders as "The texts you paste" says.

   Save. **You should see** the page save.

8. **Make the external group "Public".** In the sidebar, click the add button (**+**) next to **External
   Testing**. Type `Public` and click **Create**.
   **You should see** **Public** under External Testing.

9. **Turn off in-app feedback for Public, and leave Macs and Vision Pro off.** Select **Public**, then its
   settings tab. Under **Tester Feedback**, click **Disable**, then **Disable** in the dialog. Under **Test iPhone
   and iPad apps on Apple silicon Macs** and **Test iPhone and iPad apps on Apple Vision Pro**, leave **Enable**
   unpressed.
   In-app feedback sends Apple and you a screenshot, and a screenshot of Tortie can show a stranger's terminal.
   Testers can still email you from TestFlight, and crash reports still come. Tortie for iPhone has never run
   on a Mac or a Vision Pro.
   **You should see** **Enable** under Tester Feedback and under each of the other two.

10. **Add build 8 to Public. This submits it to Beta App Review.** With **Public** selected, click **Add
    Builds**. Choose **iOS** and **1.0.0**, select build **8**, and click **Add**. In the **What to Test** dialog,
    delete anything already there and paste text B. Select **Automatically notify testers**. Click **Submit
    Review**.
    **You should see** build 8 say **Waiting for Review**, and later **In Beta Review**. Write down the date.
    The Mac release goes out when Apple approves, or three working days after today, whichever comes first.

11. **If Submit Review fails.** App Store Connect may say "There was an error processing your request. Please
    try again later." If it says so again an hour later, it is probably the fault Apple's server names
    `BETA_CONTRACT_MISSING`. Teams report it on later builds too, one team since late February, and again after
    Apple had cleared it once. Apple has not answered it in public. Check the Agreements tab again (Before you
    start). Then report it through **Contact Us** at developer.apple.com/contact, with the words App Store
    Connect showed and the date, and tell the main session. The three working days still start from the day you
    pressed **Submit Review**.

12. **While Apple reviews.** Apple gives no time for Beta App Review. About a day is usual, and some teams
    have waited more than a week. Phase 333.7's check of the draft Mac release happens now. If Apple writes, use
    "If Apple writes" below.

13. **When Apple approves: the public link.** Apple emails you, and build 8 reads **Ready to Test** or
    **Testing**. On launch day, which is Phase 333.7's: select **Public**, open its **Testers** tab and click
    **Create Public Link**. Choose **Open to Anyone**. Do not click **Set Limit**. Click **Confirm**, then copy
    the link.
    **You should see** a link that starts `https://testflight.apple.com/join/`. Give it to the main session for
    tortie.sh/iphone, and post it nowhere else. If the link ever closes or fills, Apple's page for it names
    nothing, but tortie.sh/iphone can say what happened.

14. **Every later build.** Upload it as in rows 1 to 3, never as TestFlight Internal Only. Add it to **Public**
    with its own What to Test, and press **Submit Review** or **Start Testing**, whichever App Store Connect
    offers. If **Submit Review** fails, do row 11. If the build adds something the reviewer has not seen, say
    what in the review notes before you submit it. A build stops opening 90 days after its upload, so a newly
    approved build goes to Public at least every 75 days. Note each build's upload date.

## The texts you paste

Every text is plain ASCII, so its count in characters is also its count in bytes. None says "beta", "TestFlight",
"remote desktop", "mirror", "stream", "SSH" or "sample".

### A. Beta App Description: 681 characters

Testers see it on the public link's page and in TestFlight, so nothing in it is for the reviewer. None of Apple's
pages read on 7 October states a limit for this field; 681 is under the 4,000 that Apple sets for the review
notes.

```text
Tortie for iPhone works with Tortie for Mac, the free, open-source app at tortie.sh that keeps your coding-agent sessions and shells running on your Mac. Tap a session to open its terminal: read it, scroll back, and type into it, with keys for Esc, Tab, the arrows, Control and Return. See which sessions are waiting on you, answer a numbered question with a tap, catch up on what a session said, and end a session after Face ID, Touch ID or your passcode. You pair it once by scanning a code in Tortie on your Mac, and then it talks only to that Mac. You need an Apple silicon Mac running Tortie for Mac 0.111 or later, awake with Tortie open, and Tailscale signed in on that Mac.
```

### B. What to Test, build 8: 457 characters

No limit is stated for this field either. Every later build gets its own.

```text
Update Tortie for Mac to 0.111 or later. Then, in Tortie on your Mac, open Settings then Phone, switch on Let my phone reach this Mac, follow the three steps and scan the code. The first code can take several minutes. Open a session's terminal and type into it, answer a numbered question if one is waiting, open Catch Me Up, and end a session you do not need. Tell us anything that reads wrong or does not work, and which version of Tortie for Mac you run.
```

### C. Beta App Review notes: 2,325 characters as written, at most 3,098 filled in

Apple's limit is 4,000 characters. Fill in the placeholders before you save:

- `<seller name>`, twice: the seller name on your account, Gregory Ceccarelli, as your signing certificate names
  you (research 136 §10), unless App Store Connect shows another. Up to 40 characters.
- `<clip 1 link>` and `<clip 2 link>`: the two unlisted links from row 6. Up to 80 characters each.
- `<devices tested, from 333.4>`: the line Phase 333.4 wrote. Up to 600 characters.
- `<phone>`: the number you typed in row 7. Up to 20 characters.

At those lengths the notes are 3,098 characters. If the Ita Vero sentence goes, they are 46 shorter.

```text
WHAT THIS APP IS. Tortie for iPhone is the companion to Tortie for Mac, a free, open-source (Apache-2.0) desktop app at https://tortie.sh. Both are one open-source project by its author, <seller name>, who is the seller of this app; the source of both is public at https://github.com/gregce/tortie. Tortie belongs to Ita Vero, LLC, his company. Tortie for Mac keeps a developer's terminal sessions, coding agents and plain shells, running on their own Mac through quits and crashes, and brings them back after a restart. The iPhone app is for that developer away from the Mac. It lists their sessions with the ones waiting on them first. Tapping one opens its terminal, to read, scroll back and type into. It answers a numbered question with one tap, shows what the session said (Catch Me Up), and ends a session after Face ID, Touch ID or the passcode.

HOW TO REVIEW IT. The app needs the developer's own Mac. Two videos show it working on a physical iPhone: a camera video of pairing, with the code scanned and Allow pressed on the Mac, at <clip 1 link>, and a screen recording of use from launch, at <clip 2 link>.

CODE EXECUTION (2.5.2). Nothing is downloaded or run on the phone. The terminal is text the Mac sends. Keys go to that session on the person's own Mac, and every command runs there.

HOW IT CONNECTS. No account and no sign-in in this app, and no server of ours. The person scans a code Tortie for Mac shows and allows the phone on the Mac. The phone then talks only to that Mac, over the internet through Tailscale Funnel, which the person runs on their own Mac under their own Tailscale account, with TLS 1.3 from phone to Mac. The app uses Apple's frameworks only and no third-party code. The app collects nothing.

OUTSIDE SERVICES. Tailscale Funnel, on the person's Mac. Tortie uses no AI service itself; sessions may run coding agents the person installed, which talk to their makers under those makers' terms.

DEVICES AND VERSIONS TESTED. <devices tested, from 333.4>

PERMISSIONS. Camera: only to read the pairing code. Face ID or Touch ID: only before ending a session. Notifications: asked only when the paired Mac can send alerts; the app works fully without them.

REGIONS. The same in every region. A developer tool, not a regulated field.

CONTACT. <seller name>, support@tortie.sh, <phone>.
```

## If Apple writes

**Where to answer.** In App Store Connect, open Tortie, then **App Review** in the sidebar under **General**, and
reply to their message there. Do not upload a new build just to answer a question: Apple says a new submission
starts a new review, after which App Review can no longer reply to your earlier message.

**If they reject build 8.** A rejected build can never be used in TestFlight again, so anything that fixes it
goes up as build 9. Tell the main session which guideline they cite, then:

- **2.1, they could not use the app without a Mac.** Reply once with the two clip links. Build 9 brings See a
  sample (Phase 333.3) and goes to review as soon as it is built.
- **4.3, spam or a copy of other apps.** Paste text D, with its placeholders filled as in text C.
- **4.2.7, the rule for apps that show another computer.** Paste text E.
- **Never** offer to remove, hide or rename the terminal, or send a build without it to get past review and put
  it back later. Apple lists "attempting to hide features in review" among the signs that start an
  investigation.
- If your reply does not change their answer, stop. The phone plan then needs your ruling (research 140 §12).
  Apple's page says a beta rejection is appealed by contacting TestFlight App Review, through Contact Us.

Apple states no length limit for a reply. Both are short.

### D. If they cite 4.3: 791 characters as written, at most 965 filled in

```text
Thank you for reviewing Tortie. Tortie for iPhone and Tortie for Mac are one open-source project by <seller name>. Its source and its whole history are public at https://github.com/gregce/tortie, and Tortie for Mac is at https://tortie.sh. Tortie belongs to Ita Vero, LLC, his company.

Tortie is not a copy of another app. What sets Tortie apart: its sessions keep running on the Mac through a quit or a crash, and come back after a restart; it runs any coding agent or a plain shell; there is no account and no server of ours; and both apps are open source. The iPhone app works only with Tortie for Mac, on the person's own Mac.

A screen recording of the app from launch is at <clip 2 link>, and pairing is filmed at <clip 1 link>. We would welcome a call to show it working, at <phone>.
```

### E. If they cite 4.2.7: 616 characters as written, at most 763 filled in

```text
Thank you for reviewing Tortie. Tortie for iPhone is a terminal app for the person's own Mac, like the terminal apps already on the App Store. Tortie for Mac runs the sessions. The iPhone app draws a session's terminal from text the Mac sends, and sends the keys the person types to that session. It never shows a picture of the Mac's screen or of any app's window. Nothing is downloaded or run on the phone, and every command runs on the person's own Mac.

A screen recording of the app from launch is at <clip 2 link>, and pairing is filmed at <clip 1 link>. We would welcome a call to show it working, at <phone>.
```

## Not covered yet

- **See a sample.** Build 8 has none, and the notes do not mention it. Phase 333.3 builds it for build 9.
- **The rest of launch day.** Pointing tortie.sh/iphone at the link, promoting the Mac release and merging the
  README are Phase 333.7's.
- **Whether two clips and notes are enough at Beta App Review.** CC Pocket passed the App Store that way for
  seven months, but it is a chat app, not a terminal.
- **Whether 4.3 or 4.2.7 is raised.** There is no record either way. If 4.2.7 is raised and the reply fails, no
  build fixes it.
- **Whether `BETA_CONTRACT_MISSING` reaches your team.** Teams report it on later builds too, and after Apple had
  cleared it once. One team says it also stopped their public link taking new testers. There is no public fix.
- **Apple's limits for the Beta App Description and What to Test.** No Apple page read on 7 October states one.
- **The labels only you can see.** The heading of Test Information's review section, the Marketing URL and
  Privacy Policy URL fields, and the wording of the mark that says a build is internal are on no public Apple
  page. The table below says which labels were checked, and where.
- **An iPad, iOS 27, a hardware keyboard and VoiceOver**, beyond what 333.4's first pass on build 8 measured.
- **Whether a public link ever expires.** Apple says only that you can switch it off at any time.

---

## Where each row was checked (for the agents)

Every Apple page below was read on 7 October 2026 between 21:36 and 21:59 EDT (8 October, 01:36 to 01:59 UTC),
signed out, and is cited by URL. The fix round read the pages it cites again, signed out, between 22:44 and
22:50 EDT (02:44 to 02:50 UTC), and those rows say so. "His side" means a label on a page that needs his sign-in, which no agent may
open, and that no public Apple page names; each is marked. The Xcode words were read out of Xcode 26.3's own
binary, `/Applications/Xcode.app/Contents/SharedFrameworks/IDEDistribution.framework/Versions/A/IDEDistribution`,
as `build/p316/CHECKLIST.md` row 7 did. Tree lines are at `5155bd57`; "333.1's spec" is
`/private/tmp/wt-p3331/build/p3331/SPEC.md`, in flight and read only. Every sentence of texts A to E is traced in
the writer's claims table, which is scratch and not in the tree.

| Row | What it tells him to find | Where it was checked |
| --- | --- | --- |
| Intro | The command line cannot upload; his four answers of 7 October | `docs/BACKLOG.md:42305` (`xcodebuild -exportArchive` refused); his answers, `docs/BACKLOG.md:42481` |
| Before | Build 8, the three steps, **Scan code** | 333.1's spec D26 (build 8, `:148`), §1 (`:100-102`), D20 (`:142`); `CURRENT_PROJECT_VERSION = 7` today, `ios/Tortie.xcodeproj/project.pbxproj:417` |
| Before | The pages and the mailbox | `curl` at 21:49 EDT: https://tortie.sh 200, /privacy 404, /support 404, /iphone 404, https://github.com/gregce/tortie 200. Again in the fix round at 22:44 EDT: tortie.sh, /privacy and /support 200 (`last-modified` 02:11:10 GMT, so deployed between the two readings); /iphone and /iphone/ 404 (`last-modified` 02:11:11 GMT, the same deploy); www.tortie.sh/iphone 307 to tortie.sh/iphone. `dig +short MX tortie.sh @1.1.1.1`: `1 smtp.google.com.` at both. /iphone is in the gate because research 140 §5 row 1 and §8 row 2 put 333.5's holding page there before the first submission, and the Mac's code face names it (`SCAN_LINE`, `src/renderer/settings/PhoneSection.tsx:88`, today; `GET_PHONE_APP`, "Get it at tortie.sh/iphone.", in 333.1's tree at `src/renderer/settings/PhoneSection.tsx:133` and its spec §5.4.4, `:542`) |
| Before | **Business**, **Agreements** tab; the revision of August 18, 2026; the developer account | https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/ ("Select Business at the top of the page. On the Agreements tab", written for the Paid Apps row); https://developer.apple.com/support/terms/apple-developer-program-license-agreement/ (the agreement ends "August 18, 2026"); https://developer.apple.com/support/terms/, read at 22:48 EDT ("the English version of the Apple Developer Program License Agreement you accept in your developer account is binding"; "Last update: August 18, 2026"). That the account page is developer.apple.com/account is his side |
| Before | The Ita Vero sentence and its condition | `LICENSE:189`; research 136 §10 (path A, the written licence); research 140 §10.3 (drop it if the licence does not exist, because then it is not checkable). The site now names Ita Vero, so dropping it from the notes alone no longer takes it out of review: https://tortie.sh/privacy, read at 22:44 EDT, begins "Tortie for iPhone and Tortie for Mac are made by Ita Vero, LLC.", and it and https://tortie.sh/support end "© 2026 Ita Vero, LLC". The © line is his answer of 30 September (`docs/BACKLOG.md:42333`) |
| 1 | **Window > Organizer**, **Archives** | https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases ("choosing Window > Organizer", "select Archives in the sidebar"), read as its JSON at https://developer.apple.com/tutorials/data/documentation/xcode/distributing-your-app-for-beta-testing-and-releases.json because the page draws itself with script. **Show in Finder**: not on that page; his side, as in `build/p316/CHECKLIST.md` row 6 |
| 1 | The archive read and its words | `PASS_WORDS`, `build/p316/test-ios.mjs:312`, said by `:1578` for `--read-app`; 333.1's builders keep them unchanged and add the three tortie.sh addresses to the read (`/private/tmp/wt-p3331` diff of `build/p316/test-ios.mjs`) |
| 2 | **Distribute App**, **App Store Connect**, **Distribute** | Apple's Xcode page: "click Distribute App", the recommended option "TestFlight & App Store", and "click the Distribute button". Xcode 26.3's binary: `App Store Connect` with "Use recommended settings to upload app to App Store Connect for testing and release.", and no `TestFlight & App Store` anywhere in it. **The two names differ; the row uses Xcode 26.3's and names Apple's once** |
| 2 | Why never **TestFlight Internal Only** | Xcode 26.3's binary: `TestFlight Internal Only`, "Use recommended settings to distribute for internal testing with TestFlight."; https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/ ("can only be added to internal tester groups"); https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/ ("indicated as internal under the build number ... you can't submit them for external testing or to customers"). The wording of that mark is his side |
| 2 | Xcode may change the build number | Apple's Xcode page: the option is used "to update the build number of the content in your archive". Xcode 26.3's binary: "Should Xcode manage the app's build number when uploading to App Store Connect? Defaults to YES." and "Next available build number". Research 140 §9 step 6 |
| 2 | The email; **Apps**, **TestFlight** tab, **Builds**, **iOS** | https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/ ("You'll receive an email when this process is complete"); https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-export-compliance-information-for-beta-builds/ ("In Apps, select the app", "Click the TestFlight tab", "under Builds, click the platform") |
| 3 | **Missing Compliance**, **Manage**, **Provide Export Compliance Information**, **Save** | The export compliance page above, all four. The answer is his on every upload (`docs/BACKLOG.md:42333`); `ios/Tortie/Info.plist` holds no export compliance key, his decision 7 (`build/p316/CHECKLIST.md` row 8); Apple's encryption only, research 136 §6.3 (`ios/Tortie/Door/DoorClient.swift:596`, CryptoKit in `ios/Tortie/Door/Pairing.swift`) |
| 4 | **Internal Testing**, **Add Builds**, **Next**, **What to Test**, **Add**; an internal group first | The add internal testers page above, all five, read again at 22:46 EDT: its "Add builds to a group" steps run "click Next", "Enter the What to Test information", then "Click Add", and say "This information will be available to testers in all groups that have access to the build", which is why row 10 replaces whatever the dialog holds; the invite external testers page ("you must first create an internal group") |
| 5 | His two checklists; row 1 of the second does not apply | `build/p337/CHECKLIST.md` (its row 1 is the Allow that 337.1's new route asked for); `build/p3331/CHECKLIST.md`, which 333.1 writes (in flight); build 8 moves no route, so no paired phone is asked to allow again (333.1's spec D30, `:152`) |
| 6 | A filmed clip and a screen recording | Research 140 §9 step 9; https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review ("Apps with required hardware must provide a video (not a screen recording)"); whether a Mac counts as required hardware is not known (research 140 §12), hence "may count". Recorded on build 8, after row 5, because 333.1 moves the camera behind **Scan code** (333.1's spec D20); research 140 §9 had the clips before build 8's upload |
| 6 | **Unpair this iPhone**, **Unpair**, the first screen again; **Pair** under **Pair your phone** | Row 5 ends paired (`build/p3331/CHECKLIST.md` C4 pairs, and `build/p337/CHECKLIST.md` runs paired). `Copy.unpairThisIPhone`, `Copy.unpair`, `ios/Tortie/Style/Copy.swift:363`, `:377` (`:398`, `:412` in 333.1's tree); Unpair leaves the phone on Pairing (Phase 316.6's U1, `probe:p316`). Step 3's title and its **Pair** with a phone paired: `build/p3331/CHECKLIST.md` "Before you start" ("**Pair your phone**", "step 3 **Paired** with **Pair**"), 333.1's spec §5.4.4 (`:532`, "Step 3, Pair your phone") and D17 (`:139`, "With a phone paired, step 3's Pair keeps today's behaviour"). That Pair then shows a code with the door on is today's behaviour and is not re-measured here; 333.1's R10 (`:1041`) measures it with the door off |
| 7 | **Additional**, **Test Information**, **Beta App Description**, **Feedback Email**, **Invitation Experience** | https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/, all five ("This field is required"; the App Information box pulls screenshots "from the latest approved version") |
| 7 | **Marketing URL**, **Privacy Policy URL** | **His side.** No help page names these fields. The API names them `marketingUrl` and `privacyPolicyUrl`: https://developer.apple.com/documentation/appstoreconnectapi/betaapplocalization/attributes-data.dictionary |
| 7 | The review section: first and last name, phone with + and the country code, email, **Sign-in required**, **Notes** | The test information page above links "Learn about the TestFlight App Review information properties." to https://developer.apple.com/help/app-store-connect/reference/app-review-information, which answered `301` to https://developer.apple.com/help/app-store-connect/reference/platform-version-information at 22:49 EDT; that page, read at 22:47 EDT, names "Contact: Name, email, phone number" ("including a plus sign (+) followed by the country code ... the field doesn't accept numbers-only entry"), "Notes" and "Sign-in required: Username and password". It is written for an App Store version, and Apple's own link is what applies it to TestFlight. It has one Name field; the first and last name split is the API's, `contactFirstName` and `contactLastName`, beside `contactPhone`, `contactEmail`, `demoAccountRequired` and `notes`: https://developer.apple.com/documentation/appstoreconnectapi/betaappreviewdetail/attributes-data.dictionary. **His side:** the section's heading, which research 136 §3 step 11 calls "Beta App Review Information" and no public page names |
| 8 | **External Testing**, **+**, **Create** | The invite external testers page above |
| 9 | Settings tab, **Tester Feedback**, **Disable**, **Enable** | https://developer.apple.com/help/app-store-connect/test-a-beta-version/view-tester-feedback/ (its steps say "below Testers & Groups, select a tester group", where the invite page says "under External Testing"; the row says only "Select Public"). Email feedback stays: the same page ("All testers can still send email feedback using the TestFlight app"). Crash reports stay: https://developer.apple.com/documentation/xcode/acquiring-crash-reports-and-diagnostic-logs ("TestFlight users of your app automatically share crash reports with you, regardless of the device settings"), read as its JSON. Never run on a Mac or a Vision Pro: `TARGETED_DEVICE_FAMILY = 1`, `ios/Tortie.xcodeproj/project.pbxproj:437`, and research 140 §8 row 5 measures iPhone and iPad only |
| 9 | **Test iPhone and iPad apps on Apple silicon Macs**, **Test iPhone and iPad apps on Apple Vision Pro**, **Enable** | https://developer.apple.com/help/app-store-connect/test-a-beta-version/test-iphone-and-ipad-apps-on-macs-with-apple-silicon and https://developer.apple.com/help/app-store-connect/test-a-beta-version/test-iphone-and-ipad-apps-on-apple-vision-pro/ ("click Enable" turns each on, so each is off until pressed) |
| 10 | **Add Builds**, platform and version, **Add**, **What to Test**, **Automatically notify testers**, **Submit Review** | The invite external testers page above ("Depending on the build's status, click either Submit Review or Start Testing"; "The first build you submit requires a full review") |
| 10 | **Waiting for Review**, **In Beta Review** | https://developer.apple.com/help/app-store-connect/reference/app-build-statuses |
| 10 | Three working days | His answer 1, `docs/BACKLOG.md:42481` |
| 11 | The error's words and `BETA_CONTRACT_MISSING` | https://developer.apple.com/forums/thread/848325, read through the fetch tool at about 21:40 EDT (a plain fetch got a browser check): its first post, of 19 September, quotes the page's "There was an error processing your request. Please try again later." and the server's `ENTITY_UNPROCESSABLE.BETA_CONTRACT_MISSING`; no reply from Apple. The fix round read four more through the fetch tool between 22:44 and 22:46 EDT, each with no Apple reply: https://developer.apple.com/forums/thread/848226 (it "recurred" after an engineer "said things were unblocked", again "with my build #124", and "blocked me from sharing the TestFlight External beta link with new testers"); https://developer.apple.com/forums/thread/848666 ("Since renewing our Apple Developer Program membership (late Feb 2026), we can't submit any build to Beta App Review"; the page's words "There was an error processing your request"); https://developer.apple.com/forums/thread/849154 (every build on the account expired on 30 September, then the 422 on an external submission); https://developer.apple.com/forums/thread/849738 (the 422 again, no start date). So research 140 §3's "It shows only at the first external submission" (`docs/research/140-the-public-beta-beside-the-release.md:157`, `:562`) does not hold, and row 11, row 14 and "Not covered yet" do not repeat it |
| 11 | **Contact Us** | The link in the navigation of every help page above, https://developer.apple.com/contact/, which answers with a sign-in page; not opened further |
| 11 | The clock runs | Research 140 §9 step 14 |
| 12 | No time for Beta App Review; about a day; more than a week | https://developer.apple.com/distribute/app-review/ gives times for App Review only; research 140 §1 and §3 (Runway's means, forum 819916) |
| 13 | The approval email; **Ready to Test**, **Testing** | The invite external testers page ("users ... with the Admin role will receive an email"); the build statuses page |
| 13 | **Testers** tab, **Create Public Link**, **Open to Anyone**, **Set Limit**, **Confirm** | The invite external testers page above, all five |
| 13 | The link's form; post it nowhere else | Research 140 §14.1 (live link pages at testflight.apple.com/join/) and §6 ("A full or closed link shows one sentence and no app name") |
| 14 | 90 days; at least every 75 | https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/ ("Your build becomes unavailable for testers after 90 days"); research 140 §9 step 19 |
| 14 | If **Submit Review** fails, row 11 | Forum 848226 above: the fault came back on that team's later builds |
| 14 | Say what a later build adds | Guideline 2.3.1(a), https://developer.apple.com/app-store/review/guidelines/ ("All new features ... must be described with specificity in the Notes for Review") |
| Texts | Text C's limit | https://developer.apple.com/documentation/appstoreconnectapi/betaappreviewdetail/attributes-data.dictionary ("Review notes have a maximum of 4,000 characters"). The App Store's own form says 4,000 bytes (the platform version page above); every text is ASCII, so the two agree |
| Texts | No limit for texts A and B | Neither the test information page, the API pages for `description` and `whatsNew` (https://developer.apple.com/documentation/appstoreconnectapi/betabuildlocalization/attributes-data.dictionary) nor Apple's API specification (https://developer.apple.com/sample-code/app-store-connect/app-store-connect-openapi-specification.zip, version 4.5.1, no `maxLength` on either) states one |
| Texts | The counts | Counted by a script over the texts exactly as above, and again by `awk` in the fix round: A 681, B 457, C 2,325 (3,098 filled), D 791 (965), E 616 (763), all ASCII. The Ita Vero sentence and the space before it are 46 |
| Texts | Two phrases that differ from research 140's drafts | Text C's "through quits and crashes, and brings them back after a restart" and text D's "keep running ... through a quit or a crash, and come back after a restart", where research 140 §10.3 said both kept running through a restart: after a restart Tortie replays the scrollback and prepares each agent's resume command (`README.md:79`). Text D's "What sets Tortie apart", where research 140 §10.3 said "what only Tortie does": research 140 §4 finds other apps that are open source, or have no account and no server |
| If Apple writes | **App Review**, under **General**; a rejected build is spent | The invite external testers page ("click App Review from the sidebar under General"); the build statuses page ("can no longer be used in TestFlight. To begin testing, upload a new build") |
| If Apple writes | Reply, do not resubmit; hiding features | https://developer.apple.com/help/app-review/after-submitting-for-review/review-status ("Resubmitting starts a new review, after which App Review can no longer reply to your previous message"; "attempting to hide features in review") |
| If Apple writes | The appeal | The invite external testers page's FAQ ("contact TestFlight App Review"), linking https://developer.apple.com/contact/#!/topic/SC1103/subtopic/30021/solution/select, which needs his sign-in |
| If Apple writes | 4.3 and 4.2.7 | The guidelines page above ("Last Updated: June 8, 2026"); research 140 §5 rows 5 and 6, §10.3's reply plans, §12 |
