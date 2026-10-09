# Submitting Tortie for iPhone to the App Store

This is every field you fill in to put Tortie for iPhone on the App Store, in the order you meet them, with the words to paste. It comes after the public beta. Apple's App Store review is stricter than Beta App Review about a reviewer being able to use the app, so the build you submit needs two things the beta build does not have yet.

Everything happens at appstoreconnect.apple.com: Apps, then Tortie, then the **Distribution** tab. The pages below are in its left sidebar. If a page sits under a different heading from the one named here, find it by its own name.

## Submit only when these are true

1. **The public beta has run for a while** with no report of the phone app breaking.
2. **The build has See a sample (Phase 333.3).** It lets a reviewer use the app with made-up sessions and no Mac, which answers Apple's most likely rejection (guideline 2.1, "we could not use the app"). When it lands I give you a final version of the review notes that tells the reviewer how to open it.
3. **The build has passed the iPad and iOS 27 check (Phase 333.4).** Apple reviewers have rejected iPhone-only apps this year after trying them on an iPad. That phase also gives you the line listing the devices tested, for the notes.
4. **Your use video shows the newest iOS.** Your videos were made on iOS 26.7. If a newer iOS is out by then, record the use video again from launch, the same way as before, and send it to me so I replace the copy on tortie.sh before you submit.
5. **If you stay Individual, you have a written licence from Ita Vero, LLC for the name.** The copyright line and tortie.sh both name Ita Vero, LLC, while the app is sold under your own name. If you do not have one, stop and tell me.

## Decide these first

1. **The seller name.** Your developer account is an Individual account, so the store names **Gregory Ceccarelli** as the seller. The default is to stay Individual. Converting to Ita Vero, LLC needs a D-U-N-S number and takes weeks, and others report it changes the seller name on every app. If you choose it, first get Apple's written word that your team ID (4GRQMF5T5U) is kept, and start only when no build is in review and no Mac release is due, because signing can be unavailable while it runs.
2. **The EU.** Apple makes you say whether you are a trader under the EU's Digital Services Act. On 30 September you took the default: declare that you are a trader, with a P.O. box and the support contacts. A trader gives an address or P.O. box, a phone number and an email, which Apple checks against a document and shows on the app's page in the 27 EU countries; also gives payment account details if the account has none yet; and certifies that the app follows EU law. If you would rather not, leave the EU countries out (step C2) and say you are not a trader (step A6), since Apple says you are not acting as a trader in the EU if you do not distribute there. If you are unsure, Apple says to ask a lawyer.

## Screenshots

Apple requires at least one screenshot at the 6.3-inch size (1206 by 2622 pixels) and accepts up to 10 at the 6.9-inch size (1320 by 2868 pixels). Your screen recording was 1320 by 2868, so your iPhone takes the 6.9-inch size, and I make the 6.3-inch copies. Apple also says screenshots must show made-up data, not a real person's, so take them in See a sample once it is in the build, or in the demo folder from the videos with nothing private on screen.

1. Take 5 screenshots by pressing the side button and volume up together:
   - the Needs input tab with a session waiting
   - a session's terminal showing a numbered question
   - a terminal scrolled back, with the keyboard and key bar showing
   - Catch Me Up for a session
   - the Sessions tab grouped by project
2. AirDrop them to your Mac, into a folder in Downloads called `tortie-screenshots`.
3. Tell me, and I make the 6.3-inch copies beside them.

## A. App Information

In the sidebar, click **App Information** (under General).

1. **Name:** `Tortie`. It was probably set when you made the app; leave it if so.
2. **Subtitle:** `Companion to Tortie for Mac`
3. **Category:** Primary **Developer Tools**. Leave Secondary empty.
4. **Content Rights:** answer **No**. The app shows only what runs on the person's own computers.
5. **Age Ratings:** click **Set Up Age Ratings**.
   - Select none of the in-app controls or capabilities, then click **Next**. Tortie has no web browser, no content from other people, no chat between people and no advertising.
   - In every section, choose **None** or **No**, then click **Next**.
   - Under Age Categories and Override, choose **Not Applicable**, then click **Save**. It should come out as **4+**, like Termius and other terminal apps with no browser inside.
6. **Digital Services Act**, under App Store Regulations and Permits: click **Edit**. If you keep the EU and act as a trader, declare that you are one, then enter and verify the P.O. box or address, phone and email (and payment details if asked). If you leave the EU out, say you are not a trader.
7. Click **Save** at the top right.

## B. App Privacy

In the sidebar, click **App Privacy**.

1. Next to **Privacy Policy**, click **Edit**, enter `https://tortie.sh/privacy`, leave the user privacy choices URL empty, and click **Save**.
2. Click **Get Started**, choose **No, we do not collect data from this app**, and click **Save**.
3. Click **Publish** at the top right, then **Publish** in the dialog.

## C. Pricing and Availability

In the sidebar, click **Pricing and Availability**.

1. **Price:** under Price Schedule, click **Add Pricing**, keep United States (USD) as the base country or region, choose **USD 0.00 (Free)**, click **Next**, **Next** again, then **Confirm**.
2. **App Availability:** click **Set Up Availability**, choose **Specific Countries or Regions**, click **Next**, and deselect **China mainland**. If you decided to leave the EU out, also deselect its 27 countries. Click **Next**, then **Confirm**.
3. **iPhone and iPad Apps on Apple Silicon Mac:** deselect **Make this app available**. Tortie for iPhone has never been tested on a Mac.
4. **Apple Vision Pro:** deselect **Make this app available on Apple Vision Pro**.
5. Click **Save** at the top right.

## D. The version page

In the sidebar under **iOS App**, click **1.0 Prepare for Submission**.

1. **Previews and Screenshots:** drag the 6.9-inch screenshots into the iPhone area for the large Dynamic Island display (6.9-inch), and the 6.3-inch copies into the area for the medium display (6.3-inch), in the order listed above.
2. **Promotional Text:** paste text 1.
3. **Description:** paste text 2.
4. **Keywords:** paste text 3.
5. **Support URL:** `https://tortie.sh/support`
6. **Marketing URL:** `https://tortie.sh`
7. **Version:** `1.0.0`, so it matches the build. Click **Save** before you add the build.
8. **Copyright:** `2026 Ita Vero, LLC` (Apple adds the © itself).
9. **Build:** click **+** (or Add Build), choose the build with See a sample, and click **Done**. Answer export compliance as before if it asks.
10. **App Review Information:**
    - Sign-in required: leave it off. The app has no account.
    - Contact: your first name, last name, phone starting with + and the country code, and `support@tortie.sh`.
    - Notes: paste text 4 as I give it to you once See a sample lands, with your phone number filled in.
    - Attachment: attach `pairing_mac.mp4` from Downloads (the converted copy, 14 MB).
11. **App Store Version Release:** choose **Manually release this version**, so the store page goes live on the day the site and README change.
12. Click **Save** at the top right.

## E. Submit

1. Click **Add for Review** at the top right.
2. Check what it lists, then click **Submit for Review**.

The version then reads **Waiting for Review**. Apple says it typically reviews at least half of submissions within 24 hours and 90% within 48 hours.

## After Apple answers

- **Approved:** the version reads **Pending Developer Release**. Tell me, and I prepare the App Store badge, the /iphone page and the README (Phase 333.10). Then you press **Release This Version**, then **Confirm**.
- **A question or a rejection:** it appears under **App Review** in the sidebar. Send it to me. The replies to the two likely guidelines, 4.3 and 4.2.7, are already written in your TestFlight guide. Never offer to hide or remove the terminal to get through review.

## The texts

### 1. Promotional Text (156 of 170 characters)

```text
See which coding-agent sessions on your Mac are waiting on you, open their terminals and answer them from anywhere. Needs Tortie for Mac, free at tortie.sh.
```

### 2. Description (1,712 of 4,000 characters)

It says "computer" rather than "Mac" where it can, because repeating Apple's product names cost a similar app a rejection under guideline 5.2.5.

```text
Tortie for iPhone works with Tortie for Mac, the free, open-source app from tortie.sh that keeps your coding-agent sessions and shells running through quits and crashes, and brings them back after a restart.

With this app you can:
• see every session, with the ones waiting on you first
• open a session's terminal, scroll back through what it printed, and type into it, with keys for Esc, Tab, the arrows, Control and Return
• turn your phone sideways to see the terminal alone
• answer a numbered question with one tap, for supported agents on the paired computer, or type your answer in any session's terminal
• send a message to a supported agent on the paired computer waiting at its prompt, as if you had typed it there
• catch up on what a session said and where it stands
• end a session, or several at once, after Face ID, Touch ID or your passcode

Setting up takes a few minutes, once. In Tortie on your computer, open Settings, then Phone, and follow the three steps there, then scan the code with this app and allow this phone on your computer. Nothing is paired until you do.

Your sessions stay on your own computers. The app talks only to the computer you paired, over the internet through Tailscale on that computer, encrypted from your phone to that computer. There is no account, no sign-in and nothing else to install on the phone. We collect no data.

You need:
• an Apple silicon Mac running Tortie for Mac 0.111 or later, awake with Tortie open
• Tailscale signed in on that computer, with Funnel approved once
• iOS 18.1 or later

Tortie works with the coding agents you already run. Tortie is an independent product and is not affiliated with the makers of those agents or of Tailscale.
```

### 3. Keywords (94 of 100 bytes)

```text
coding agent,agent sessions,terminal,developer,ai coding,session status,workflow,shell,pairing
```

### 4. Review notes (2,527 of 4,000 bytes before the sample paragraph, your phone number and the devices line are filled in)

This is the version for today's build. Once See a sample lands I add the paragraph that tells the reviewer how to use it, and Phase 333.4 fills in the devices line, so ask me for the final notes before you paste them.

```text
WHAT THIS APP IS. Tortie for iPhone is the companion to Tortie for Mac, a free, open-source (Apache-2.0) desktop app at https://tortie.sh. Both are one open-source project by its author, Gregory Ceccarelli, who is the seller of this app; the source of both is public at https://github.com/gregce/tortie. Tortie belongs to Ita Vero, LLC, his company. Tortie for Mac keeps a developer's terminal sessions, coding agents and plain shells, running on their own Mac through quits and crashes, and brings them back after a restart. The iPhone app is for that developer away from the Mac. It lists their sessions with the ones waiting on them first. Tapping one opens its terminal, to read, scroll back and type into. It answers a numbered question from Claude Code or Codex with one tap, shows what the session said (Catch Me Up), and ends a session after Face ID, Touch ID or the passcode.

HOW TO REVIEW IT. The app needs the developer's own Mac. Two videos show it working on a physical iPhone: a camera video of pairing, with the code scanned and Allow pressed on the Mac, at https://tortie.sh/videos/pairing_mac.mp4, and a screen recording of use from launch, at https://tortie.sh/videos/using_tortie.mp4. The pairing video is also attached to this submission.

CODE EXECUTION (2.5.2). Nothing is downloaded or run on the phone. The terminal is text the Mac sends. Keys go through the person's own Mac to that session, and every command runs on the person's own computers, never on the phone.

HOW IT CONNECTS. No account and no sign-in in this app, and no server of ours. The person scans a code Tortie for Mac shows and allows the phone on the Mac. The phone then talks only to that Mac, over the internet through Tailscale Funnel, which the person runs on their own Mac under their own Tailscale account, with TLS 1.3 from phone to Mac. The app uses Apple's frameworks only and no third-party code. The app collects nothing.

OUTSIDE SERVICES. Tailscale Funnel, on the person's Mac. Tortie uses no AI service itself; sessions may run coding agents the person installed, which talk to their makers under those makers' terms.

DEVICES AND VERSIONS TESTED. <the devices line from Phase 333.4>

PERMISSIONS. Camera: only to read the pairing code. Face ID or Touch ID: only before ending a session. Notifications: asked only when the paired Mac can send alerts; the app works fully without them.

REGIONS. The same in every region. A developer tool, not a regulated field.

CONTACT. Gregory Ceccarelli, support@tortie.sh, <phone>.
```

---

## Where each step was checked (for the agents)

Apple's pages were read on 9 October 2026, signed out; the screenshot and age rating pages were read raw. The tree is `gregce/tortie` at `d7f9a03e`.

| Step | Checked against |
| --- | --- |
| Field limits: subtitle 30, promotional text 170, description 4,000 characters, keywords 100 bytes and each over two characters, notes 4,000 bytes, copyright as year and owner with © added | developer.apple.com/help/app-store-connect/reference/platform-version-information and reference/app-information |
| One screenshot at the medium Dynamic Island size required (1179 by 2556 or 1206 by 2622); 1320 by 2868 accepted for the large size; no alpha; up to 10 | reference/screenshot-specifications, "Required device sizes". Research 136 section 6.4, read on 30 September, said 1206 by 2622 was not accepted; Apple's page has since changed |
| His phone takes 1320 by 2868 | His screen recording `using_tortie.MP4`, read with ffprobe on 9 October |
| Set Up Age Ratings, None and No, Not Applicable, Save; 4+ for no web access, no user content, no chat | manage-app-information/set-an-app-age-rating and reference/age-ratings-values-and-definitions; peers by the public lookup API: Termius, Moshi, Happy, CC Pocket and Cmux Remote 4+, Blink 17+ for unrestricted web access |
| App Privacy: Edit, Save, Get Started, "No, we do not collect data from this app", Publish | manage-app-information/manage-app-privacy; `ios/Tortie/PrivacyInfo.xcprivacy` collects no data type |
| Digital Services Act at App Information, App Store Regulations and Permits, Edit; not a trader when not distributing in the EU | manage-compliance-information/manage-european-union-digital-services-act-trader-requirements |
| Add Pricing, base country, USD 0.00, Next, Next, Confirm | manage-app-pricing/set-a-price |
| Set Up Availability, Specific Countries or Regions, Next, Confirm | manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store |
| Make this app available, for Apple silicon Macs and for Apple Vision Pro | manage-your-apps-availability, the two availability pages; `ios/Tortie.xcodeproj/project.pbxproj:432-433` already turn both off in the build |
| Manually release this version; Release This Version, Confirm; Add for Review, Submit for Review | reference/platform-version-information and the release and submit pages |
| Review times | developer.apple.com/distribute/app-review |
| iOS 18.1 minimum; version 1.0.0; iPhone only | `project.pbxproj:342`, `:427`, `:437` |
| Keys Esc, Tab, the arrows, Control and Return | `ios/Tortie/Screens/ScreenKeyField.swift:434-443` |
| Sideways shows the terminal alone | `ios/Tortie/Screens/Screen.swift:203-231` |
| End and End these after Face ID, Touch ID or the passcode, and nothing else asks | `ios/Tortie/App/OwnerCheck.swift:108-111`; callers `EndBar.swift:249-250`, `EndBatch.swift:172-173` |
| One-tap answers and messages for Claude Code and Codex on this Mac only | `src/main/reply/gate.ts:27`, `:41` |
| Waiting sessions first | The Needs input tab is the first tab, `ios/Tortie/App/TortieApp.swift:630`; inside the Sessions tab, Recent puts waiting rows first, `src/main/pocket/routes.ts:1641-1660` |
| Screenshots show made-up data | App Review Guideline 2.3.9, "display fictional account information instead of data from a real person" |
| Content Rights answered No | The app shows only what the person's own computers send; research 136 section 6.2 |
| iPhone-only apps rejected after an iPad test | Research 136 section 17 (Apple developer forums threads 815079 and 820096) and research 140 section 5 |
| His videos made on iOS 26.7 on an iPhone 16 Pro Max | ffprobe of the tags of `pairing_mac.MOV`, 9 October |
| The Mac's three steps | `src/renderer/settings/phone/steps.ts:45-47` |
| Tortie for Mac 0.111 or later, Apple silicon | `package.json:4`; `ios/Tortie/Style/Copy.swift:263`; `electron-builder.yml:400`, `:402` |
| Encrypted from phone to Mac | TLS 1.3 minimum on both sides, `ios/Tortie/Door/DoorClient.swift:596`, `src/main/pocket/door/listener.ts:620-621`; Funnel passes TCP through, `src/main/pocket/funnel.ts:678` |
| Keys reach a session on another machine through the Mac | `src/main/screen/keys.ts:45-46`, `src/main/machines/scroll-order.ts:1203` |
| Apache-2.0, copyright Ita Vero, LLC | `LICENSE:1-3`, `:189` |
| The URLs | tortie.sh, /privacy, /support, /videos/pairing_mac.mp4 and /videos/using_tortie.mp4 each answered 200 on 9 October; github.com/gregce/tortie is public |
| No refused word in the store fields (remote desktop, mirror, stream, SSH, beta, TestFlight) and no other app or company in the name, subtitle or keywords | Counted by script on 9 October |
| Fewer Apple product names (5.2.5) | Research 140 sections 8 and 10.5 |
| See a sample and the iPad pass before the store | Research 136 section 13; research 140 section 5; the 333.3 and 333.4 entries in docs/BACKLOG.md |
