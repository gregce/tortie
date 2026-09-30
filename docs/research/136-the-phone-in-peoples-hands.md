# 136. The phone in people's hands: a public TestFlight link, then the App Store

Phase 333. Written 30 September 2026 against the tree at `984b3163` ("docs(backlog): the phone on TestFlight
and the store, research started"). This is documents only. Nothing was installed, signed into, uploaded or
run, and no Electron and no Simulator was started. No keychain, credential, APNs key, App Store Connect page
or other signed-in page was read. Every Apple claim quotes a public page read on 30 September 2026, first from
16:31 UTC and again, independently, from 16:44 UTC, and section 17 gives every URL. Every repository claim is a `file:line` in the tree at
`984b3163`, or in his site repository `/Users/gdc/tortiedotsh`, read only. The site files cited are
byte-identical to public `gregce/tortiedotsh` main at `38a13d06`, although his local checkout is 5 commits
behind its own origin.

The round. Three investigators each owned questions. A read Apple's requirements for external TestFlight and
the App Store. B read the App Review Guidelines against the app as it is now and as it will be after Phases
316.5, 317 and 318. C wrote his steps, every asset and who makes it, and read the two sites. One adversary
fetched every Apple page again on its own and attacked all three reports before a word of this was written.
A ruling settled each disagreement. Section 13 records what the attack killed, so no later round re-derives
it.

This answers his question of 30 September 2026, in his words: "have we mapped out the process to get the
phone on the app store so that people can download it from tortie.sh and our github page?" His rulings the
same day were "Both, TestFlight then the Store", meaning a public TestFlight link first and then the App
Store, and to run this research now. The seller name stays open. Section 10 lays out both paths and decides
neither.

## 1. The answer first

Not before today. Research 128 section 4 priced the App Store before any Swift was written. Phase 316 then
refused external TestFlight, Beta App Review, a demo mode, a privacy page and a D-U-N-S number on purpose
(`docs/BACKLOG.md:33462`). His ruling lifts exactly those refusals, and this document is the map.

The route has 2 stages:

1. A public TestFlight link goes live on the same day as the first Mac release that carries Settings then
   Phone. Anyone with the link installs the beta through Apple's TestFlight app.
2. The App Store follows, once the public beta has carried at least one build with no phone-breaking report
   and the seller name is settled.

Both stages join the release he has already fixed. Nothing is released until the phone works end to end, and
316.5 (alerts), 317 (End behind Face ID) and 318 (Reply) come first, one after another.

Ten small build entries, 333.1 to 333.10, carry the work. Four change the phone or the Mac (333.1 to 333.4).
One is a pair of pages in his site repository (333.5). Two are his own steps with a checklist an agent writes
(333.6 and 333.9). Two are launch-day changes to the sites and the README (333.7 and 333.10). One makes store
screenshots, and only if he opens that lane (333.8). Their full sections are written beside this document.

Five findings change what gets built:

- the reviewer cannot pair, because the first external review happens before any public Mac release carries
  the door (the latest is v0.110.0, and `CHANGELOG.md:12` keeps the iPhone item under Unreleased), so the app
  needs a 'See a sample' mode that everybody can see
- a pairing-only agent companion was rejected under guideline 2.1(a) this month and cured it with an in-app
  demo, and Superset was rejected under 4.3(a) in August 2026 despite a working demo account, so 2.1(a) and
  4.3 are the joint top risks
- App Review tests iPhone-only apps on an iPad and on the newest iOS, and Tortie has only ever run on an
  iPhone 16 Pro on iOS 26.3 and 18.3 (`build/p316/SPEC.md:103-104`)
- only his Mac holds the APNs key, so a stranger's phone must never be asked for a notification permission it
  cannot use, which changes 316.5 now
- a build uploaded as TestFlight Internal Only "can only be added to internal tester groups", and both
  checklists say to upload that way (`build/p316/CHECKLIST.md:95`, `build/p330/CHECKLIST.md:87`), so the
  first public build is a new upload through App Store Connect

He can start 2 things today at no cost, beside 316.5:

- request a D-U-N-S number for Ita Vero, LLC (free, up to 5 business days from D&B and up to 2 more for
  Apple), so the organisation path is open if he chooses it
- choose the public contact mailbox, because the TestFlight feedback email is shown to every tester

## 2. What his ruling lifts, and what stays refused

His ruling lifts these, which were Phase 316's refusals (`docs/BACKLOG.md:33462`):

- external TestFlight and Beta App Review
- a demo mode, which becomes 'See a sample' and is visible to everyone
- a privacy page and a support page on tortie.sh
- an App Store submission
- a D-U-N-S number and an organisation account, as one of 2 seller paths for him to choose between

These stay refused:

- a hosted demo door, or any server Ita Vero runs so a reviewer can pair (section 8)
- a push relay run by Ita Vero, which research 48 refuses
- the APNs key shipped inside Tortie for Mac, unless he rules it (section 9)
- another company's product name in the app's name, subtitle or keywords (guidelines 4.1(c) and 2.3.7)
- a background mode, NetworkExtension or any VPN wording (`conformance:ios` rules (e) and (f))
- a raw terminal on the phone, ever (section 7)
- an agent writing `ITSAppUsesNonExemptEncryption`, or answering any other legal question
- an agent taking a screenshot or screen recording, unless he opens 333.8's narrow lane
- an App Store Connect API key, unless he asks for one

## 3. His steps, route 1: the public TestFlight link

Every step marked "he" is his alone. App Store Connect needs his sign-in, and the command line cannot upload
with his Xcode account: `xcodebuild -exportArchive` refused with "Failed to find an account with App Store
Connect access for team 4GRQMF5T5U" (running log, 29 September 2026, `docs/BACKLOG.md:38211`).

Before the build, starting now:

1. He requests a D-U-N-S number for Ita Vero, LLC if he might choose path B1 (section 10). It is free.
2. He chooses one mailbox for feedback and support, on a domain he controls.
3. He answers the rulings in section 16. Each has a default, so none of them holds up the build phases.

The build phases, done by agents:

4. Agents build 316.5, then 317, then 318, as he ruled, carrying the findings in section 14.
5. Beside them, agents build 333.2 (the Mac says where to get the phone app) once 316.5 has landed, and 333.5
   (the privacy and support pages) in his site repository with his go-ahead.
6. After 318, agents build 333.1 (a stranger's phone), then 333.3 (See a sample), then 333.4 (the devices
   App Review uses).
7. He checks the whole phone end to end on an internal TestFlight build that carries all of the above.

The upload and Beta App Review, entry 333.6:

8. An agent raises `CURRENT_PROJECT_VERSION` (2 today, `ios/Tortie.xcodeproj/project.pbxproj:449`), archives
   the Release build on team 4GRQMF5T5U, runs `node build/p316/test-ios.mjs --read-app` on the archive and
   writes `build/p333/CHECKLIST.md`.
9. In Xcode's Organizer he selects the archive and chooses **Distribute App**, then **App Store Connect**,
   then **Distribute**. He never chooses **TestFlight Internal Only**.
10. When the build shows Missing Compliance, he answers the export compliance questions (section 6.3).
11. In TestFlight, under **Test Information**, he enters the Beta App Description from section 12, the
    feedback email, the marketing URL `https://tortie.sh` and the privacy policy URL
    `https://tortie.sh/privacy`. Under Beta App Review Information he enters his first and last name, a phone
    number starting with + and the country code, and an email. He leaves sign-in not required and pastes the
    review notes from section 12.
12. He checks that the internal group still exists, because an external group needs one first. Then he
    creates an external group, for example 'Public beta'.
13. He adds the build to the external group, pastes What to Test from section 12 and submits it for review.
14. He replies to App Review if they write.

Launch day, entry 333.7:

15. After approval he creates the public link with **Filter by Criteria**: iPhone, iOS 18.1 or later. A tester
    limit is optional, from 1 to 10,000.
16. The same day, he promotes the Mac release that carries Settings then Phone.
17. Within the same hour he merges the site and README changes agents prepared (section 11), and starts the
    site's changelog refresh by hand.

From then on:

18. Every new phone build goes to the public group, uploaded through App Store Connect with its own What to
    Test. A later build of the same version "might not" need a full review.
19. A new approved build goes up at least every 90 days, because each build expires 90 days after upload.

## 4. His steps, route 2: the App Store

Route 2 starts once 3 things are true: the public beta has carried at least one build with no phone-breaking
report, the seller path is settled, and the privacy and support pages are live.

1. He settles the seller path (section 10). If he chose B1, he first asks Apple in writing whether team ID
   4GRQMF5T5U is kept. He starts the conversion only when no build is in review and no Mac release is due,
   and waits for it to finish.
2. He either opens 333.8, so an agent makes the screenshots from See a sample, or captures them himself on a
   6.9-inch or 6.5-inch iPhone.
3. An agent writes the store checklist and the listing words (333.9, drafted in section 12).
4. Under **App Information** he enters the name 'Tortie', the subtitle, Developer Tools as the primary
   category, the content rights answer, the age rating questionnaire, the privacy policy URL and the EU
   trader declaration.
5. Under **App Privacy** he answers the questions (the default is 'No, we do not collect data from this app')
   and publishes them.
6. Under **Pricing and Availability** he sets the price to Free, switches off availability on Apple silicon
   Macs and on Apple Vision Pro, and leaves out China mainland. The EU storefronts follow his trader answer.
7. On the version page he adds the screenshots, promotional text, description, keywords, the support URL
   `https://tortie.sh/support`, the marketing URL, the copyright line '2026 Ita Vero, LLC', the approved beta
   build, and the App Review contact and notes. He sets version release to **Manual**.
8. He chooses **Add for Review**, then **Submit for Review**, and replies to App Review.
9. When the version reads Pending Developer Release, agents prepare 333.10. He presses **Release**, and the
   badge changes merge within the same hour.

The public TestFlight link can then carry the next version's beta. Whether he keeps it is his choice.

## 5. Every asset, and who makes it

| Asset | Route | Who makes it | Where it lives | State at `984b3163` |
| --- | --- | --- | --- | --- |
| A new build, uploaded through App Store Connect | Both | An agent archives and reads it (333.6); he uploads | His Organizer, then App Store Connect | 1.0.0 (1) uploaded; 1.0.0 (2) archived, its upload not recorded (`docs/BACKLOG.md:38211`); both checklists say Internal Only |
| Export compliance answer | Both, every upload | He answers | App Store Connect | His, per build |
| Beta App Description | TestFlight | An agent drafts (section 12); he enters | Test Information, public on the link's page | Drafted here |
| What to Test | TestFlight, every build | An agent drafts; he enters | Test Information | Drafted here |
| Feedback email | TestFlight | He chooses | Test Information, shown to testers | Not chosen |
| Review contact: name, phone, email | Both | He enters | Beta App Review Information, App Review Information | Private to Apple |
| Review notes | Both | An agent drafts; he enters | Both review forms | Drafted here |
| Privacy page | Both | An agent writes it in his site repository with his go-ahead (333.5); he merges | `tortie.sh/privacy` | Returns 404 |
| Support page with real contact details | Store required, beta advised | Same as the privacy page | `tortie.sh/support` | Returns 404 |
| In-app privacy and support links | Both (5.1.1(i), 1.5) | Agents (333.1) | The pairing screen and the list | Missing (no `privacy` or `tortie.sh` string in `ios/Tortie`) |
| See a sample | Both (2.1, 4.2.3) | Agents (333.3) | The pairing screen | Missing |
| A Mac line naming where to get the phone app | TestFlight | Agents (333.2) | Settings then Phone | `SCAN_LINE = 'Scan it with Tortie on your iPhone.'` (`src/renderer/settings/PhoneSection.tsx:75`) |
| A video of pairing on a real iPhone | Optional, both | Only he can make it | A link in the review notes | None |
| The public link | TestFlight | He creates it | App Store Connect | None |
| Site and README changes | Both launch days | Agents, in his repositories with his go-ahead (333.7, 333.10) | tortie.sh, `README.md`, `CHANGELOG.md` | None |
| The Mac release that carries the door | TestFlight launch | He promotes it | GitHub releases | Latest is v0.110.0, without Settings then Phone |
| Screenshots, 1 to 10 at 6.9 or 6.5 inch | Store | Agents under 333.8 if he opens it; otherwise he captures them | App Store Connect | Refused to agents today |
| Name, subtitle, description, keywords, promotional text, copyright | Store | An agent drafts; he enters | App Store Connect | Drafted here |
| App Privacy answers | Store | He attests | App Store Connect | His |
| Age rating | Store | He answers | App Store Connect | His |
| Category, content rights, EU trader status, price, availability | Store | He answers | App Store Connect | His |
| Seller path, D-U-N-S number, any conversion | Store | He decides and applies | Apple Developer account | Individual, team 4GRQMF5T5U |
| The App Store badge and its licence | Store launch | He accepts the licence; an agent places the artwork | tortie.sh, `README.md` | None |
| The app icon | Both | Done | Inside the build | One 1024 by 1024 image (`ios/Tortie/Assets.xcassets/AppIcon.appiconset`) |

In short, an agent may prepare:

- every text field, as drafts in section 12: the Beta App Description, What to Test, the review notes, the
  store name, subtitle, description, keywords and promotional text, and the privacy and support pages
- the archive, its read with `test-ios.mjs --read-app`, and each checklist
- the build phases 333.1 to 333.4
- the site and README changes, in his repositories and only with his go-ahead
- store screenshots, only if he opens 333.8

An XCUITest frame is a rectangle the test reads, not an image, so the rule "frames only" gives an agent no
screenshot. Until he opens 333.8, no agent makes one.

Only he can do:

- anything in App Store Connect, including every upload
- the export compliance answer, the App Privacy answers, the age rating, content rights and the EU trader
  declaration
- the seller path, the D-U-N-S request and any conversion
- accepting Apple's badge artwork licence
- creating the public link
- promoting the Mac release
- filming a video on a real iPhone, if he wants one

## 6. Apple's requirements, as read on 30 September 2026

### 6.1 External TestFlight

| Requirement | What Apple says | Source |
| --- | --- | --- |
| The build must not be Internal Only | "Builds uploaded as TestFlight Internal Only from Xcode or Xcode Cloud are marked as internal under the build number and can only be added to internal tester groups." | Invite external testers |
| An internal group comes first | "To create an external group for external testing, you must first create an internal group for internal testing." | Invite external testers |
| Beta App Review | "The first build you submit requires a full review, but later builds for the same version might not." Up to 6 builds in 24 hours, one build per version in review at a time | Invite external testers |
| The guidelines apply | Guideline 2.2: a TestFlight build "should comply with the App Review Guidelines", "cannot be distributed to testers in exchange for compensation of any kind", and significant updates "should be submitted to TestFlight App Review" | Guidelines |
| Beta App Description | "This field is required." It appears on the public link's page, so nothing private goes in it | Provide test information; a live public link page |
| Feedback email | Required. "This is also the reply-to address in email invitations to testers" | Provide test information |
| Beta App Review contact | First name, last name, phone and email; a sign-in flag; notes of up to 4,000 characters | API attribute pages for `betaAppReviewDetail` |
| Marketing URL | Optional, "visible to testers in the TestFlight app" | API attribute page for `betaAppLocalization` |
| Privacy policy URL | "Recommended for all apps that collect user or device-related data or as otherwise required by law". Whether the form blocks submission without it is unmeasured | API attribute page for `betaAppLocalization` |
| Testers | Up to 10,000 external testers per app. Testers need the TestFlight app on iOS 16 or later | Invite external testers; TestFlight for testers |
| The public link | 'Open to Anyone' or 'Filter by Criteria' (device and OS). An optional tester limit from 1 to 10,000. "Anyone can share this link." Testers who join through it show as anonymous. "You can make the public link deactivate at any time." Whether the link itself expires is unmeasured | Invite external testers |
| How long a build lasts | "Each build is available to test for up to 90 days, starting from the day the developer uploads their build." Up to 100 builds shared at once | TestFlight for testers; TestFlight |
| Export compliance | A build shows Missing Compliance until answered (section 6.3) | Export compliance for beta builds |
| EU trader rules | Not for TestFlight: "If you don't distribute apps on the App Store in the EU (for example you only distribute apps through alternative distribution, or TestFlight ...), you're not acting as a trader" | EU Digital Services Act page |
| How long review takes | Apple gives no time for Beta App Review. Developer reports range from 2 days to 10 | A third-party blog, May and August 2025 |

### 6.2 The App Store

| Requirement | What Apple says | Source |
| --- | --- | --- |
| Name | 2 to 30 characters | App information |
| Subtitle | Up to 30 characters, optional. Must not "reference other apps, or make unverifiable product claims" (2.3.7) | App information; guidelines |
| Privacy policy URL | "Required for iOS and macOS apps" | App information |
| Privacy link inside the app | 5.1.1(i): "All apps must include a link to their privacy policy in the App Store Connect metadata field and within the app in an easily accessible manner." | Guidelines |
| App Privacy answers | Required for the store. "Collect" means "transmitting data off the device in a way that allows you and/or your third-party partners to access it for a period longer than what is necessary to service the transmitted request in real time". "You are not responsible for disclosing data collected by Apple." | App privacy details; manage app privacy |
| Support URL | Required. It "must lead to actual contact information (legal address, email address, telephone number), as may be required by local law". Guideline 1.5 asks for "an easy way to contact you" in the app and at that URL | Platform version information; guidelines |
| Description | Up to 4,000 characters, plain text | Platform version information |
| Keywords | Up to 100 bytes. "Names of other apps or companies aren't allowed." | Platform version information |
| Promotional text | Up to 170 characters, optional | Platform version information |
| Copyright | "The name of the person or entity that owns the exclusive rights". `LICENSE:189` reads "Copyright 2026 Ita Vero, LLC" | Platform version information |
| Screenshots | Section 6.4 | Screenshot specifications |
| Age rating | Required; "An Unrated app can't be published on the App Store". The questionnaire gained social media questions in 2026 | Set an app age rating; news |
| Category | Developer Tools covers "coding, testing, debugging, workflow management". Apple may re-categorise (2.3.5) | Categories |
| Content rights | Apps that "access third-party content must have all the necessary rights" | App information |
| EU trader declaration | Required even if the app is not offered in the EU (section 10) | EU Digital Services Act page |
| China mainland | The Ministry of Industry and Information Technology requires an ICP filing number of "some apps". Left out by default | App information |
| App Review contact | Name, email, phone "in international format, including a plus sign (+)". Notes up to 4,000 bytes. Sign-in details only if the app needs a login | Platform version information |
| Reviewer access | "Provide App Review with full access to your app." The demo account, demo mode and "sample QR code" sentence starts "If your app includes account-based features", which Tortie does not have. "If features require an environment that is hard to replicate or require specific hardware, be prepared to provide a demo video or the hardware." | Guidelines, 'Before you submit'; App Review page |
| Price | A free app ships under the Developer Program License Agreement, with no Paid Apps Agreement | Sign and update agreements |
| Other platforms | "By default, your compatible apps are published automatically on the App Store for Apple Vision Pro or Mac". He deselects 'Make this app available' | Submitting; Mac availability page |
| Release | 'Manual' holds an approved version at Pending Developer Release until he presses Release | Platform version information |
| SDK and target | Xcode 26 and the iOS 26 SDK since 28 April 2026. The iOS 27 SDK from April 2027. Tortie targets iOS 18.1 (`project.pbxproj:342`) and builds with Xcode 26.3 | Upcoming requirements |
| Accessibility Nutrition Labels | Voluntary now; "over time, you'll be required" | Accessibility Nutrition Labels overview |
| Review time | "On average, 90% of submissions are reviewed in less than 24 hours." | App Review page |
| Guidelines revision | The page reads "Last Updated: June 8, 2026", the same revision research 128 read | Guidelines; news |

### 6.3 Export compliance

Since Phase 330 all of the app's cryptography is Apple's. The door client is Network.framework over TLS 1.3
(`ios/Tortie/Door/DoorClient.swift:341-350`). Pairing uses CryptoKit: AES-256-GCM under HKDF-SHA256 and a
signature (`ios/Tortie/Door/Pairing.swift:13-19`). TailscaleKit and Go are gone (`build/p330/SPEC.md:34`).

Apple's table maps "Your app uses encryption limited to that within the Apple operating system" to "No
documentation required in App Store Connect". That is not the same answer as
`ITSAppUsesNonExemptEncryption = NO`, which Apple defines as an app that "uses no encryption, or only uses
encryption that's exempt". Apple also mentions a possible year-end self-classification report. So the answer
stays his.

Research 128 section 5's worry, a Go WireGuard stack that is not the operating system's encryption, no longer
applies. `conformance:ios` rule (e) refuses the Info.plist key as his legal answer
(`build/conformance-ios.mjs:873`). The default is that he answers in App Store Connect on each upload. If he
gives a written answer instead, a phase writes it into Info.plist and changes rule (e) in the same commit.

### 6.4 Screenshots

The store needs 1 to 10 iPhone screenshots, JPEG or PNG, with no alpha channel, at one of these sizes:

- 6.9 inch: 1260 by 2736, 1290 by 2796 or 1320 by 2868 pixels
- 6.5 inch: 1242 by 2688 or 1284 by 2778 pixels, required only if no 6.9-inch set is given

A 6.3-inch iPhone gives 1206 by 2622, which is not an accepted size. No iPad set is needed, because the app is
iPhone only (`TARGETED_DEVICE_FAMILY = 1`, `project.pbxproj:437`). Screenshots "should show the app in use"
(2.3.3) and must "display fictional account information instead of data from a real person" (2.3.9), so
his own sessions cannot be used. Apple now lists iPhone Duo sizes too, with uploads "available later this
year".

No agent can make them under today's rules. `conformance:ios` rule (i) refuses every photograph in a test
(`PHOTOGRAPHS`, `build/conformance-ios.mjs:1199`) and requires `uiTestingScreenshotsEnabled` false
(`:1175`). `gate:simulator` refuses `simctl io screenshot` outside its helper
(`build/assert-simulator-teardown.mjs:91` and `:159`). CLAUDE.md's Simulator rule says no screenshot is ever
taken. So either he opens 333.8, a narrow lane for one named script, or he captures See a sample himself on a
6.9-inch or 6.5-inch iPhone. His phone's model is unmeasured.

## 7. The review risks, and their answers

This table reads each guideline against the app at `984b3163` and as it will be after 316.5, 317 and 318.
Quotes are from the guidelines page, read 30 September 2026.

| Guideline | Today | After 316.5, 317, 318 | Risk | The answer, and the entry that carries it |
| --- | --- | --- | --- | --- |
| 2.1(a) "full access", the reviewer cannot use it | A reviewer cannot pair: no public Mac release carries the door | The same | Joint highest | See a sample, visible to all (333.3), how to open it in the review notes, and his optional video |
| 4.3 spam | A crowded category: at least 6 approved agent companions, and Superset rejected under 4.3(a) in August 2026 despite a demo account | The same | Joint highest | The first sentence of every description names Tortie for Mac. Name 'Tortie' alone. No vendor marks. The identity paragraph in the notes. A reply to Apple writes "4.3" with no letter, as research 128 section 4 advised |
| 2.4.1 and 2.1 on an iPad and on the newest iOS | Never run on an iPad, iOS 27 or iPhone Duo | 317 adds biometrics | Medium | 333.4 drives the Release app on each before submission |
| 5.1.1(i) privacy link in the app | Missing | Missing | Certain for the store; likely for the beta, through 2.2 | 333.1 and 333.5, live before the first external submission |
| 1.5 contact | Missing | Missing | Medium | 333.5's support page and 333.1's link |
| 5.1.1(iii) push permission | SPEC S5 asks every phone at pairing (`build/p316/SPEC.md:660`) | A stranger's phone is asked for alerts that cannot arrive | Medium | Ask only when the paired Mac can send (section 9, sent to 316.5) |
| 4.5.4 and 5.1.2(i), push not required | Nothing needs push | Must stay true | Low | 316.5's own row: alerts off, the app still works |
| Face ID purpose string | Not used | 317 needs `NSFaceIDUsageDescription` | High if missing: Apple says "This key is required if your app uses APIs that access Face ID" | Sent to 317, with a Touch ID and passcode path |
| 4.2.3(i) "work on its own" | Nothing else to install on the phone; it needs a Mac | The same | Low | See a sample makes part of the app work on its own. The first description sentence names Tortie for Mac. The pairing screen names tortie.sh (333.1) |
| 4.2.7 remote desktop | Structured records drawn natively, never a screen | 318 types into a session | Low while no terminal reaches the phone | No raw terminal, ever. The notes never say "SSH" or "remote desktop" |
| 4.2.7(e) thin clients for cloud apps | The server is the person's own Mac | The same | Low | The notes say "the person's own Mac, reached through their own Tailscale" |
| 5.2.2 third-party services | Funnel carries the connection; agent output is shown | The same | Low | The same sentence. Tortie is not a service |
| 4.7 software not in the binary, "chatbots" | Nothing is typed | 318 types to an agent | Medium-low | Research 128's defence: the agent is not software Tortie offers. Research 135 writes it for 318 |
| 5.1.2(i) sharing with third-party AI | The app only shows words | 318's typed words reach the agent's maker | Medium-low | One sentence on where typed words go, in the privacy page and in 318's first send if he chooses |
| 2.3.1(a) hidden or dormant features | Retired: no message box and no send control (`ios/Tortie/Screens/SessionScreen.swift:3-7`) | 318 adds real controls | Low | See a sample visible to everyone. The notes describe every feature |
| 5.1.1(iv) alternatives to consent | The camera is the only way to pair | The same | Low to moderate | The words say how to allow the camera (`Copy.cameraOff`). A typed code is not queued |
| 4.1(c) and 2.3.7 other developers' names | None in the app's name | None | Low | Name 'Tortie' alone. No vendor marks in name, subtitle or keywords |
| 5.2.1 who owns the intellectual property | Seller 'Gregory Ceccarelli'; the product is Ita Vero's | The same | Low to medium, his legal call | A written licence under path A, or path B1 (section 10) |
| 2.5.5 IPv6-only networks | Unmeasured. The client dials a host name through `NWConnection` (`DoorClient.swift:318`) | The same | Low | Stated as unmeasured in 333.4 |
| 5.4 VPN, 2.5.4 background modes | Off, and held off by `conformance:ios` | Off | None | Unchanged |
| US and other age-assurance laws | Texas SB 2420 has applied since 4 June 2026; Utah, Louisiana, Brazil, Australia and Singapore announced | 317 and 318 may be a "significant change" | Unmeasured, legal | His to decide |

How approved companions describe needing a desktop (4.2.3(i)), each store page read 30 September 2026:

- Happy: "This app requires Codex or Claude Code to be installed on your computer."
- Unified Remote: "Install the free server on your computer"
- Steam Link: "Computer running Steam - Windows, Mac, or Linux"
- Immich: "This is a client app for Immich Server and you will need to run/manage the server on your own"
- Remote Codetrol: "a Mac or Linux machine running the Remote Codetrol server"
- Mobile for Claude Code: "Run a single command on your Mac"

Each says so in its first lines. No record was found of a 4.2.3 rejection of a desktop companion, and that
silence is not evidence. The one 4.2.3 rejection found (forum 114795, March 2019) was cured by making part of
the app work without the other app: "Only part of your app needs to function without WhatsApp".

Why 4.2.7 does not fire, and why "no raw terminal" is now absolute. Its preamble applies to an app that "acts
as a mirror of specific software or services", and Tortie draws structured records natively. If it ever
fired, clause (a) needs "a local and LAN-based network". Research 128 ruling 7 kept the home Wi-Fi bind as the
one way to meet that. Since Phase 330 the door binds `127.0.0.1` only and is reached through Funnel
(`src/main/pocket/bind.ts:13`), so that way out is gone. Steam Link, a mirror, was rejected in May 2018 and
shipped in May 2019 as local-network only. Approved agent clients that type over the internet (Mobile for
Claude Code, Remote Codetrol, T3 Code) show reviewers do not apply 4.2.7 to records. Superset's own notes call
their app "in the same class as an SSH or remote desktop client" (`/Users/gdc/superset/apps/mobile/store.config.js:13`),
and Tortie must never write that.

## 8. How a reviewer uses the app

The duty that binds is the first sentence of Apple's list: "Provide App Review with full access to your app."
The demo account, demo mode and "sample QR code" sentence is conditioned on "If your app includes
account-based features", and Tortie has no accounts.

The timing makes this unavoidable for the public beta, not only for the store. The first external Beta App
Review happens before any public Mac release carries the door, so a reviewer cannot install the Mac half at
all.

| Way | For it | Against it | Ruling |
| --- | --- | --- | --- |
| See a sample inside the app, visible to everyone (333.3) | The only precedent in this category was cured this way: Control Plane PR #52, "Apple rejected 1.0 (build 14) under 2.1(a) because reviewers could not use the app without a computer. This adds a local demo mode" (merged 30 September 2026). It also answers 4.2.3, and it is the source of fictional screenshots for 2.3.9 | Real product work. It must never read as the person's own Mac, and it must never reach the network | Chosen |
| A video he films on a real iPhone, linked in the notes | Apple names a demo video for "an environment that is hard to replicate". It moves no refusal | No precedent shows a video alone clearing 2.1(a) for a software companion. Only he may film it, because agents may not record screens | Optional, beside the sample |
| A hosted demo door Ita Vero keeps running | A reviewer would touch a real door | A reviewer cannot pair unattended unless the door allows by itself, which breaks "Nothing is paired until you do" (`Copy.pairMatchNote`). A code expires in 3 minutes (`POCKET_PAIRING_WINDOW_MS`, `src/main/pocket/pairing.ts:1124`). It rests on Funnel's beta and on Tailscale's Personal plan, which is "only suitable for non-commercial use" (research 132 section 3.4). It needs a Mac awake through every review. It is the exact option that returned 503 for Control Plane | Refused |

What See a sample must be, so it passes the guidelines and keeps the door's promises:

- reachable from the pairing screen by anyone, so it is not a hidden feature under 2.3.1(a)
- fictional sessions from a file inside the app, decoded through the same `Contract.swift` the door's answers
  go through, so the sample cannot drift from what the door sends
- never able to reach `DoorClient`, the keychain or the network, which a new `conformance:ios` rule proves
- labelled as a sample on every screen, so no fixture status such as 'Needs your input' reads as the person's
  own Mac
- End and Reply act only on the sample's own copy, in memory, and nothing leaves the phone

Whether a sample mode in an app with no login needs Apple's "prior approval" under 2.1(a) is unmeasured. That
sentence attaches to a demo mode offered "in lieu of a demo account", and Tortie has no account to stand in
for.

## 9. Alerts for other people

Only his Mac holds Ita Vero's APNs provider key, and Apple says the key "must remain private to prevent
anyone else from generating those tokens". Phase 316 recorded "No push for anybody but the operator"
(`docs/BACKLOG.md:33464`) and research 127 section 11 question 6 is still open.

| Way | Cost | Ruling |
| --- | --- | --- |
| Ship the key inside Tortie for Mac, as Bark does | One extraction lets anyone push to any device token they obtain. One revocation breaks every install | His to rule; not the default |
| An Ita Vero relay | Research 48 refuses it. Ita Vero would then collect device tokens and alert text, so the App Privacy answers and the privacy page change | Refused unless he overrules research 48 |
| Alerts stay his alone | A stranger's phone never gets alerts | Default |

Under the default, 316.5 must not ask a phone for notification permission, and must not draw "Pair again to
get alerts", unless the paired Mac holds an alert key and its switch is on. A Mac with no key shows no alert
switch (`PUSH_LABEL`, `src/renderer/settings/PhoneSection.tsx:97`). No beta or store copy promises alerts.
The current SPEC asks at pairing (`build/p316/SPEC.md:660`), which on a stranger's phone asks for a feature
that cannot work (5.1.1(iii)). Guidelines 4.5.4 and 5.1.2(i) already require every screen to work with
notifications denied. iOS shows its own fixed prompt, so the only thing Tortie controls is when it asks.

## 10. The seller name

His Apple account is Individual: 'Gregory Ceccarelli', team 4GRQMF5T5U (`electron-builder.yml:9`, and the
checklist at `build/p316/CHECKLIST.md:14`). Ita Vero, LLC owns the product (`LICENSE:189`). His ruling leaves
the choice open. Both paths are laid out here and neither is decided.

| Path | Seller on the store | What it needs | What it costs | Default |
| --- | --- | --- | --- | --- |
| A. Stay Individual | 'Gregory Ceccarelli'. The developer name was fixed when the app record was created and "You can't edit or update this name later" | Copyright '2026 Ita Vero, LLC'. A written licence from Ita Vero to him for the name, for 5.2.1 (the code's Apache-2.0 licence grants no trademark rights, `LICENSE:138-141`). As an EU trader, his address or a P.O. box, phone and email shown on EU product pages | The company is not the named seller | For the public beta |
| B1. Convert this account to Ita Vero, LLC | 'Ita Vero, LLC', the legal entity name. Never 'Tortie': Apple does not accept "DBAs, fictitious businesses, trade names" | He must be the founder. A D-U-N-S number. Possibly business documents. The enrolment page also asks new organisations for a company-domain email and a public company website; whether a conversion asks for them is inference | Weeks, by forum reports. A third party says the signing portal is unavailable during the migration, which would stall both the phone and the Mac release. Whether team ID 4GRQMF5T5U survives is unmeasured, and the Mac updater's signature check and the phone's keychain may depend on it. "Changing your organization name will update your vendor name across all your apps" | Request the D-U-N-S number now. Choose A or B1 before the store submission. Start B1 only after Apple confirms in writing that the team ID is kept |
| B2. A new organisation account, then an app transfer | 'Ita Vero, LLC' | A version already released on the store. TestFlight switched off first | Removing every build and tester kills the public link. A new APNs key in the new team. Phones probably pair again | Refused by default |
| B3. Remove the record before release and start again under a new account | 'Ita Vero, LLC' | A new record and a new bundle id | "you'll lose ownership of the app name", and "your bundle ID can't be reused". A new APNs key and team. Phones pair again | Refused by default |

The EU Digital Services Act applies at the store, not the beta. An individual trader shows an address or
P.O. box, a phone number and an email on EU product pages, checked against a document. An organisation shows
the address held against its D-U-N-S number. Every trader gives payment account details, even for a free app.
The default is to declare trader status. Under path A he uses a P.O. box and the support contacts. If he will
not publish those personally, the 27 EU storefronts are left out until B1 is done.

tortie.sh names Ita Vero on none of its pages; the name appears only in the changelog data
(`/Users/gdc/tortiedotsh/src/data/changelog.json:2295` and `:3281`). Whether Apple would accept tortie.sh as
Ita Vero's website under B1 is unmeasured.

## 11. The two sites

### 11.1 tortie.sh today

Every download link comes from one file of 2 lines, `src/data/site-links.ts:1-2` (`TORTIE_REPOSITORY_URL` and
`TORTIE_MACOS_DOWNLOAD_URL`). It feeds the hero, the navigation, the Download section, the demo page, the
docs' install steps and the JSON-LD `downloadUrl` (`src/pages/index.astro:30`). The design keeps one blue
action: "The One Blue Rule. Blue means action or focus. It should remain rare enough that the download path is
unmistakable" (`DESIGN.md:104`), and the navigation has "one persistent blue download action" (`DESIGN.md:163`).

The Download section puts its actions in column 3 of a 3-column grid, as a flex row that does not wrap on
desktop and stacks below 720 pixels (`src/components/Download.astro`, styles `.download-actions`). A second
action needs layout work, not a drop-in. `vercel.json` holds only one headers rule and no redirects.
`/privacy`, `/support` and `/iphone` all return 404.

### 11.2 During the beta (333.7)

Everything lands on launch day, within the hour after he promotes the Mac release:

- `tortie.sh/iphone`, a temporary redirect in `vercel.json` to the public TestFlight link, so the README,
  release notes and the Mac's own line never go stale when the link changes or becomes a store link
- `TORTIE_IPHONE_URL = "https://tortie.sh/iphone"` in `src/data/site-links.ts`
- a second action in the Download section that is not blue, reading 'Tortie for iPhone · Join the beta' over
  the line 'Needs Tortie on your Mac · iOS 18.1 or later'
- a docs page 'Your iPhone' beside 'Remote machines' (`src/data/docs.ts:137`), with the 4 steps below
- `public/llms.txt:25`, the JSON-LD `operatingSystem` (`src/pages/index.astro:28`) and the comparison row
  (`src/data/comparison-catalog.ts:951`, platform and its source) updated, with the README's new section as the
  primary-source evidence the comparison policy asks for
- `scripts/verify-site-routes.mjs` asserting the redirect and both new pages

The hero and the navigation keep their one macOS action. During the beta the site uses a plain text link and
never a badge: Apple's badge licence covers only apps "available for download on the App Store", and Apple
offers no TestFlight badge.

The docs page steps, in the words the app and the Mac draw:

1. Join the beta on TestFlight from `tortie.sh/iphone` on your iPhone.
2. In Tortie on your Mac, choose **Pair a Phone…** (`src/main/menu.ts:615`) and switch on **Let my phone reach
   this Mac** (`DOOR_LABEL`, `PhoneSection.tsx:61`).
3. If Tailscale asks, approve Funnel once.
4. Press **Pair**, scan the code with Tortie on your iPhone, check the six groups match, then press **Allow**
   on your Mac.

Its limits, one clause each: it needs Tailscale signed in on your Mac; the Mac must be awake with Tortie open;
the first code can take several minutes to appear. Alerts are mentioned only if he rules they reach other
people.

### 11.3 After the store (333.10)

- Apple's own black badge artwork, one per layout, at least 40 pixels high on screen, with clear space of a
  quarter of its height. He accepts the Marketing Artwork License, because it binds "an authorized
  representative for your developer account"
- `tortie.sh/iphone` moved to `https://apps.apple.com/app/id<Apple ID>`
- a Smart App Banner, `<meta name="apple-itunes-app" content="app-id=<Apple ID>">`, in the layout's head
- Apple's credit lines, copied from the marketing guidelines on the day, where the footer's legal links sit
  (`src/components/Footer.astro:24-33` has only 'License' today)
- the README badge and `llms.txt` updated

Apple also offers a "Pre-order on the App Store" badge, which could appear once the app is approved for
pre-order. It is not in the plan.

The standalone Apple logo. Every 'Download for macOS' button draws one (`src/components/AppleMark.astro`, used
by `Hero.astro:20`, `Nav.astro:72` and `:76`, and `Download.astro:14`), and the README badge asks for
`logo=apple` (`README.md:11`). Apple's trademark rules forbid the Apple Logo on third-party websites without a
written licence, and its marketing guidelines say "Don't use the standalone Apple logo". Accepting the badge
licence binds Tortie to those rules. The default is to replace it with text or a neutral icon in 333.10. The
call is his.

### 11.4 README and the GitHub page

The badge row (`README.md:9-16`) links only to the Mac release and the website. During the beta it gains a
neutral link to `tortie.sh/iphone`, never a home-made App Store badge. Apple's badge replaces it after
release. The Install section (`README.md:171-178`) gains a part headed '### On your iPhone (beta)' with the
same 4 steps as the docs page. GitHub release pages carry no phone asset, because an iOS app cannot be
side-loaded (`.github/workflows/release.yml:229-234` attaches the DMG, the ZIP, a blockmap and
`latest-mac.yml`).

### 11.5 Release pages

Release pages on tortie.sh cannot carry a clickable link today. Investigator C ran a copy of the site's sync
script on a fixture: a markdown link inside an item became its label, a bare URL stayed plain text, and a
markdown link in the lead paragraph was printed literally as `[text](url)`
(`scripts/sync-changelog.mjs:38-46`, `src/pages/docs/changelog/index.astro:41`). The renderer already draws
links for contributors (`src/components/InlineReleaseText.astro`), so a small change in his site repository
could allow them. The ruling keeps words only anyway. GitHub release notes are the CHANGELOG entry, copied by
hand (`.github/workflows/release.yml:228`), and GitHub renders their links.

So `CHANGELOG.md:12`'s last clause, "and the app is on TestFlight rather than the App Store", becomes "and the
app is a public beta on TestFlight, linked from tortie.sh" only when the link is live, and only on his word.
The site's changelog refreshes weekly (`.github/workflows/refresh-changelog.yml`, cron `47 7 * * 1`), so on
launch day he starts it by hand.

## 12. Drafts of every text field

Words in square brackets are added only when the named phase has landed. Every draft names Tortie for Mac in
its first sentence, uses no agent vendor's name as a mark, and never says "remote desktop", "SSH" or "remote
control".

### 12.1 Beta App Description (public on the link's page)

> Tortie for iPhone works with Tortie for Mac, the free, open-source app at tortie.sh that keeps your
> coding-agent sessions running on your Mac. It lists every session with the ones waiting on you first, shows
> how each is going and scrolls back through its whole conversation. [317: You can end a session, confirmed
> with Face ID.] [318: You can answer a session that is waiting on you.] You pair it once by scanning a code in
> Tortie on your Mac, and then it talks only to that Mac. Before you pair, open See a sample to look around.
> Your Mac must be awake with Tortie open and Tailscale signed in.

### 12.2 What to Test (the first public build)

> Pair with your Mac: in Tortie on your Mac choose Pair a Phone…, switch on Let my phone reach this Mac, press
> Pair and scan. Then look at the list, one session and its conversation. [317: End a session you do not need,
> and confirm.] [318: Answer a session that is waiting on you.] Tell us anything that reads wrong, and which
> version of Tortie for Mac you run.

### 12.3 Review notes (both forms; about 1,700 characters with every bracket filled, against a limit of 4,000)

> WHAT THIS APP IS. Tortie for iPhone is the companion to Tortie for Mac, a free, open-source (Apache-2.0)
> desktop app made by Ita Vero, LLC at https://tortie.sh, with its public repository and release history
> at https://github.com/gregce/tortie. Tortie for Mac keeps a person's coding-agent sessions running on their
> own Mac. The iPhone app shows those sessions: which are waiting, how each is going, and its conversation as
> structured records drawn natively. It never shows or streams a terminal screen. [317: It can end a session
> after Face ID, Touch ID or the passcode.] [318: It can answer a session that is waiting.] [Path A: Tortie
> belongs to Ita Vero, LLC, and this developer account is its founder's.]
>
> HOW TO REVIEW IT WITHOUT A MAC. On the first screen, tap See a sample. The app then shows made-up sessions
> from a file inside the app, with a sample label on every screen. Nothing leaves the phone in the sample.
> Every screen is reachable from there: the list, a session and its conversation [317: , and End] [318: , and
> Reply]. Tap Leave sample to return to pairing. [If he films one: A video of pairing and use on a real iPhone
> is at <link>.]
>
> THERE IS NO ACCOUNT. The app has no sign-in and no account, and we run no server. A person pairs it with
> their own Mac by scanning a code Tortie for Mac shows, then allows the phone on the Mac. The phone then
> connects only to that Mac, over the internet, through Tailscale that the person has signed in to on their
> own Mac. We collect nothing.
>
> NOTIFICATIONS. The app works fully with notifications off. [Only if alerts reach other people: ...]
>
> CONTACT. <his name, the support mailbox>.

The label words ('See a sample', 'Leave sample') are drafts. 333.3 fixes them in `Copy.swift`, and the notes
then quote them byte for byte. The notes may say Apache-2.0 because `LICENSE:1-3` was re-read at `984b3163`,
which research 128 section 4 asked of any licence stated to Apple. They leave out any promise of a same-day
answer, which research 128 cut under 2.3.7.

### 12.4 Store listing

| Field | Draft | Length |
| --- | --- | --- |
| Name | Tortie | 6 characters |
| Subtitle | Companion to Tortie for Mac | 27 characters |
| Promotional text | See which coding-agent sessions on your Mac are waiting on you, how each is going and what it said. Needs Tortie for Mac, free at tortie.sh. | 140 characters |
| Keywords | coding agent,agent sessions,developer,session status,ai coding,workflow,monitor,companion,pairing | 97 bytes |
| Primary category | Developer Tools | |
| Support URL | https://tortie.sh/support | |
| Marketing URL | https://tortie.sh | |
| Privacy policy URL | https://tortie.sh/privacy | |
| Copyright | 2026 Ita Vero, LLC | |

Whether App Store Connect has reserved 'Tortie' for the record is unmeasured. The public search API finds no
US app named Tortie and nothing under `com.itavero.tortie.phone` (queried 30 September 2026).

The description:

> Tortie for iPhone works only with Tortie for Mac, the free, open-source app from tortie.sh that keeps your
> coding-agent sessions running on your Mac through quits, crashes and restarts.
>
> With the iPhone app you can:
> • see every session on your Mac, with the ones waiting on you first
> • see how each session is going and what it last said
> • scroll back through a session's whole conversation
> [317: • end a session, confirmed with Face ID, Touch ID or your passcode]
> [318: • answer a session that is waiting on you]
>
> It shows records of the conversation and never a terminal. The terminal's own output stays on your Mac.
>
> Pairing takes one scan. In Tortie on your Mac, choose Pair a Phone…, press Pair, scan the code with this
> app and allow the iPhone on your Mac. Nothing is paired until you do.
>
> Your sessions stay on your Mac. The app talks only to the Mac you paired, over the internet through
> Tailscale on that Mac. There is no account, no sign-in and nothing else to install on the phone. We
> collect no data.
>
> You need:
> • an Apple silicon Mac running Tortie for Mac, awake with Tortie open
> • Tailscale signed in on that Mac, with Funnel approved once
> • iOS 18.1 or later
>
> Before you pair, open See a sample to look around with made-up sessions.
>
> Tortie works with the coding agents you already run on your Mac. Tortie is an independent product and is
> not affiliated with the makers of those agents or of Tailscale.

### 12.5 The privacy page (`tortie.sh/privacy`, 333.5)

> Privacy
>
> Tortie for iPhone and Tortie for Mac are made by Ita Vero, LLC. We do not collect your data. We have no
> accounts, no analytics, no advertising and no crash reporting, and no data passes through a server we run.
>
> What leaves your iPhone. Tortie for iPhone talks only to the Mac you paired it with. When you pair, it sends
> the phone's public keys and the name 'iPhone', sealed so only your Mac can read them [with alerts: and the
> address Apple gives your phone for alerts]. After that it sends signed requests to read your sessions
> [317: and to end a session you choose] [318: and the answers and messages you type]. Your Mac answers with
> your sessions: their names, projects, status and conversation.
>
> How it gets there. Your phone reaches your Mac over the internet through Tailscale Funnel, which your Mac
> runs under your own Tailscale account. The connection is encrypted from your phone to your Mac. Tailscale's
> relay can see your phone's internet address, your Mac's name, when you connect and how much is sent, but not
> what is sent.
>
> [Alerts, if they are on. When a session starts waiting, your Mac sends an alert to Apple, which delivers it
> to your phone. The alert carries the session's name, project, machine, agent and a status word. It never
> carries the question or the conversation.]
>
> [318: What you type. What you type goes to your Mac and into that session's agent. That agent may send it
> to the company that makes it, under that company's terms. Tortie sends it nowhere else.]
>
> Camera, Face ID and Touch ID. Tortie uses the camera only to read the pairing code. iOS handles Face ID and
> Touch ID, and Tortie only learns whether you were confirmed.
>
> Keeping and deleting. Your sessions live on your Mac, in Tortie for Mac. Remove on your Mac ends a phone's
> pairing at once.
>
> Contact. <the support mailbox>. Last updated <date>.

Two sentences are owed a check in 333.5 before the page goes live: that the camera keeps and sends no picture,
and what deleting the app removes from the phone. iOS keychain items can outlive an app's deletion, so no
sentence about the phone's copy is written until 333.5 has read the code.

### 12.6 The support page (`tortie.sh/support`, 333.5)

> Support
>
> Email <the support mailbox>. [An address or P.O. box and a phone number, where EU trader rules or local law
> require them.] Report a problem with Tortie for Mac at https://github.com/gregce/tortie/issues.
>
> What Tortie for iPhone needs: Tortie for Mac on an Apple silicon Mac, awake with Tortie open, and Tailscale
> signed in on that Mac.
>
> If the first code does not appear, wait. Your Mac's name can take several minutes to reach the internet the
> first time.
>
> Tortie for iPhone and Tortie for Mac update separately. If one says a code or an answer is from another
> version, update the one it names.

## 13. What was refuted

| Claim before the attack | What killed or changed it | Where it went |
| --- | --- | --- |
| A: builds 1.0.0 (1) and (2) were both uploaded | `docs/BACKLOG.md:38211` records build 2 as archived with "UPLOAD WAITING ON HIS CLICK", and no later line says it went up | Irrelevant: a new build is uploaded through App Store Connect anyway |
| A: the public link itself never expires | No Apple page says so. Apple says only that it can be switched off and that builds expire after 90 days | Unmeasured |
| B: the guidelines page shows no last-updated date | It reads "Last Updated: June 8, 2026" | Corrected |
| B: video first, sample mode second, for the reviewer | The only precedent in the category was cured by an in-app demo. The first external review comes before any public Mac release carries the door. No precedent shows a video alone clearing 2.1 for a software companion | See a sample first, the video optional |
| A and B: Apple's "sample QR code" is a duty | It is conditioned on "If your app includes account-based features". The duty that binds is "Provide App Review with full access to your app" | Section 8 |
| A: hermes-fleet #18 is a precedent for a reviewer gateway | It is an unchecked 'Remaining acceptance' item, not something done or approved | Struck |
| B: 4.3 is a medium risk | Superset's August 2026 4.3(a) rejection came despite a demo account, and at least 5 approved peers crowd the category | Joint top risk with 2.1(a) |
| B and C: the pairing label is the person's device name | `UIDevice.current.name` returns the generic 'iPhone' on iOS 16 and later without the user-assigned-device-name entitlement. Tortie has no entitlements and a floor of 18.1 | Strengthens 'Data Not Collected'. Every phone is labelled 'iPhone' on the Mac, a follow-up not queued here |
| A: an age rating of 4+ is likely | Peers that show unfiltered model output range from 4+ to 12+ (T3 Code 12+, Remote Codetrol 9+, Happy and Mobile for Claude Code 4+) | His attestation, answered deliberately |
| B: `NSFaceIDUsageDescription` must be "added and allowed" | `conformance:ios` keeps no allow list (`PINNED_PLIST_KEYS` is empty, `build/conformance-ios.mjs:855`), so 317 only adds it | The requirement holds |
| Any reading that Phase 330's all-Apple cryptography settles `ITSAppUsesNonExemptEncryption = NO` | "No documentation required" is not the same answer as NO | The answer stays his |
| A: China mainland needs an ICP filing | Apple says the regulator requires one of "some apps" | Still left out by default |
| C: the Download section takes a second action as a drop-in | The actions are a flex row that does not wrap, in grid column 3 | Layout work in 333.7 |
| C: release pages cannot carry a link | They cannot only because the sync script strips links; the renderer already draws links | Words only, by ruling |
| A: the work-email and public-website criteria apply to a conversion | They come from the enrolment page. The conversion page names only a D-U-N-S number and possibly business documents | Marked as inference |
| C: unmeasured whether the seller name changes on conversion | A third party (Subsplash, April 2024) says the legal entity name applies to all apps and the signing portal is unavailable during migration. Apple has not said so | Narrowed, still not Apple's word |
| Research 128 section 4, in 4 places | 2.1(a) was set aside because the app has no login, but it was cited this month against a pairing-only agent app. The held-composer 2.3.1(a) risk is retired at HEAD (`SessionScreen.swift:3-7`). The home Wi-Fi way to meet 4.2.7(a) is gone since Phase 330 (`bind.ts:13`). Its export worry about a Go WireGuard stack no longer applies | Corrected here |

Held under attack: every guideline quote in the three reports is verbatim on the live page. The TestFlight
limits, the export table, the EU rules, the fixed developer name, the conversion's D-U-N-S requirement, the
transfer conditions, the screenshot sizes and Apple's trademark rules were all fetched again by the adversary
and hold.

## 14. What this sends to 316.5, 317 and 318

To 316.5, now. Do not ask a phone for notification permission, and do not draw "Pair again to get alerts",
unless the paired Mac holds an alert key and its switch is on. A Mac with no key shows no alert switch.
`build/p316/SPEC.md:660` currently asks at pairing, and that line changes. The phone needs a way to know, most
likely a field the door already answers, which 316.5's spec step decides.

To 317. Face ID needs `NSFaceIDUsageDescription` in `ios/Tortie/Info.plist`, which holds only
`NSCameraUsageDescription` today. It also needs a Touch ID and passcode path, because iOS 18.1 runs on Touch ID
iPhones and App Review tests on iPads. The words must say what the device has, so a Touch ID phone never reads
"Face ID".

To 318, through research 135. Answer 4.7 and 5.1.2(i): say once where typed words go (to the person's own
agent on their own Mac, and from there to that agent's maker), and decide whether the first send shows it.
Add no raw terminal. Describe every new control in the review notes, as 2.3.1(a) asks.

To CLAUDE.md, carried by 333.1. The `conformance:ios` row says rule (e) "requires the local network string",
but since Phase 330 the gate refuses `NSLocalNetworkUsageDescription` (`build/conformance-ios.mjs:868`).

Found in passing and not queued: every paired phone arrives on the Mac labelled 'iPhone'
(`ios/Tortie/App/TortieApp.swift:106`), so two phones cannot be told apart.

Once strangers install, the phone and the Mac update on separate clocks. A version mismatch today reads "That
is not a Tortie pairing code." (`Pairing.swift:98` `unsupportedCode`, mapped at `DoorWords.swift:155`), and
build 1 already failed to pair with the newer door (`build/p330/CHECKLIST.md`). From the first public build,
the door's routes and the QR version change only by adding, or with a sentence on both sides naming which one
to update. 333.1 replaces the misleading sentence.

## 15. What is not settled

These are unmeasured, with where each gets answered:

- whether the TestFlight form blocks external review without a privacy policy URL; the only first-hand
  enforcement found was triggered by a HealthKit entitlement (forum 66585, 2016), so 333.5's pages go live
  first either way
- whether build 1.0.0 (2) was uploaded, and how; only App Store Connect shows it
- how long Beta App Review takes for this app, whether the public link expires, the Beta App Description's
  character limit, and what the link's page says when no build is available
- whether B1 keeps team ID 4GRQMF5T5U, its APNs key and the bundle id, how long B1 takes, and whether Apple
  would accept tortie.sh as Ita Vero's website; Apple answers these in writing, and he asks
- whether Ita Vero already has a D-U-N-S number or a company-domain email
- whether Apple Support could set a developer name of 'Tortie' after the fact
- which name the App Store Connect record reserved
- whether `SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = NO` (`project.pbxproj:432`) alone keeps the app off the
  Mac App Store; he deselects the checkbox anyway
- whether a new team ID makes the phone's keychain items unreadable (paths B2 and B3)
- whether the Mac updater's signature check depends on the team ID or the developer name (path B1)
- whether Apple counts a Mac companion as "another app" under 4.2.3(i); there is no Apple statement
- whether Control Plane's resubmission with its demo mode was approved
- whether a video alone clears 2.1(a) for a software companion
- whether a sample mode in an app with no login needs Apple's prior approval
- how strict Beta App Review is against full App Review
- any 4.7 or 5.1.2(i) finding against a shipped agent companion that types to agents
- whether Apple enforces 5.2.1 when an individual publishes an LLC's product
- whether Tailscale's Funnel relay counts as a "third-party partner" for App Privacy; the privacy page names it
  regardless
- the app in iPad compatibility mode, on iOS 27 and on iPhone Duo (333.4), and whether `simctl` installs an
  iPhone-only build on an iPad Simulator, which is 333.4's first measurement
- the app on an IPv6-only network, accepted as low risk because the client dials a host name through
  `NWConnection`
- his iPhone's model, which decides whether his own screenshots are an accepted size
- what Texas SB 2420 and the other age-assurance laws ask of a free app with no accounts, and whether 317 and
  318 count as a "significant change"
- whether the camera path keeps any picture, and what deleting the app removes from the phone (333.5 reads the
  code before the privacy page says either)

## 16. The rulings it needs from him

1. Seller name, both paths and not decided. Path A, stay Individual: the seller reads 'Gregory Ceccarelli'
   (the developer name was fixed when the record was created), copyright reads '2026 Ita Vero, LLC', and he
   gives himself a written licence from Ita Vero for the name (5.2.1). Under the EU Digital Services Act an
   individual trader shows an address or P.O. box, a phone and an email. Path B1, convert this account to Ita
   Vero, LLC: it needs a D-U-N-S number and founder status, takes weeks by forum reports, leaves the signing
   portal unavailable during the migration (which stalls both the phone and the Mac release), and it is
   unmeasured whether team ID 4GRQMF5T5U survives, which the Mac updater's signature check and the phone's
   keychain depend on. The seller becomes 'Ita Vero, LLC', never 'Tortie'. B2 and B3 reset the public link and
   every pairing. Default: path A for the public beta. Request the D-U-N-S number now so B1 is ready. Choose
   between A and B1 before the store submission. Start B1 only after Apple confirms in writing that the team
   ID is kept, and never while a build is in review or a Mac release is due.
2. Alerts for other people (research 127 section 11 question 6, Phase 314 Ruling 6): ship the APNs key inside
   the Mac app as Bark does (one extraction lets anyone push), run an Ita Vero relay (research 48 refuses it,
   and it changes App Privacy), or keep alerts yours alone? Default: yours alone. The phone asks for permission
   only when its Mac can send, a Mac with no key shows no alert switch, and no copy promises alerts. This
   finding goes to 316.5 now.
3. How the reviewer uses the app: an in-app 'See a sample' that everyone can see (333.3, real product work), a
   video you film on a real iPhone, or both? Default: See a sample, plus your optional video as a link in the
   review notes. A hosted demo door is refused.
4. Store screenshots: open a narrow 333.8 lane (one named script may photograph See a sample on a 6.9-inch
   Simulator, never used as verification evidence), or capture them yourself on a 6.9-inch or 6.5-inch
   iPhone? Your phone's model is unmeasured. Default: open the narrow lane.
5. Export compliance: answer in App Store Connect on each upload, or give a written answer that goes into
   Info.plist (which changes `conformance:ios` rule (e))? Default: answer on each upload. The app's
   cryptography is Apple's own since Phase 330, and the legal reading is yours.
6. Public contact details: the TestFlight feedback email is public (it is the reply-to on invitations). The
   store's Support URL must lead to real contact details (address, email, phone where local law requires).
   The App Review contact stays private to Apple. Default: one mailbox on a domain you control for feedback
   and support, a P.O. box if an address must be shown, and your phone for App Review only.
7. EU storefronts at store time (Digital Services Act): declare trader status and publish contact details, or
   leave the 27 EU storefronts out? Default: declare trader. Under path A use a P.O. box and the support
   contacts. If you will not publish those personally, leave the EU out until B1 is done.
8. The standalone Apple logo on tortie.sh's 'Download for macOS' buttons (`AppleMark.astro`) and the README's
   `logo=apple` badge: Apple's trademark rules forbid it without a licence, and accepting the App Store badge
   licence binds Tortie to those rules. Default: replace it with text or a neutral icon in 333.10.
9. iOS 27 for 333.4: will you install the iOS 27 Simulator runtime, and iPhone Duo's if Xcode offers it, so
   the phase can drive the devices review now uses? Agents install nothing. Default: yes, before 333.4.
   Otherwise those rows stay unmeasured and are reported to you.

## 17. Evidence

Every Apple page below was read on 30 September 2026, first by investigator A from 16:31 UTC and again,
independently, by the adversary from 16:44 UTC. Copies of the fetched text are in the session's
scratchpad under `p333/investigator-a/`, `p333/investigator-c/` and `p333/adversary/`, and are not in the tree.

### 17.1 Apple: TestFlight

| Page | URL |
| --- | --- |
| Invite external testers | https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/ |
| Provide test information | https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/ |
| TestFlight overview | https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/ |
| TestFlight for testers | https://developer.apple.com/testflight/testers/ |
| TestFlight | https://developer.apple.com/testflight/ |
| App build statuses | https://developer.apple.com/help/app-store-connect/reference/app-build-statuses |
| Beta App Review detail attributes (API) | https://developer.apple.com/documentation/appstoreconnectapi/betaappreviewdetail/attributes-data.dictionary |
| Beta app localization attributes (API) | https://developer.apple.com/documentation/appstoreconnectapi/betaapplocalization/attributes-data.dictionary |
| Export compliance for beta builds | https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-export-compliance-information-for-beta-builds/ |
| Upload builds | https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/ |
| A live public link, for the page's shape (GitHub's beta) | https://testflight.apple.com/join/NLskzwi5 |

### 17.2 Apple: the App Store

| Page | URL |
| --- | --- |
| App Review Guidelines, "Last Updated: June 8, 2026" | https://developer.apple.com/app-store/review/guidelines/ |
| The June 8, 2026 revision | https://developer.apple.com/news/?id=a233fmpw |
| The November 13, 2025 revision (4.1(c), third-party AI in 5.1.2(i)) | https://developer.apple.com/news/?id=ey6d8onl |
| Developer news (iOS 27 submissions 9 September 2026, iPhone Duo, Texas 3 June 2026, age requirements 24 February 2026, social media questions) | https://developer.apple.com/news/ |
| App information | https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/ |
| Platform version information | https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/ |
| Screenshot specifications | https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/ |
| App privacy details | https://developer.apple.com/app-store/app-privacy-details/ |
| Manage app privacy | https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/ |
| App privacy reference | https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy/ |
| Age ratings values and definitions | https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/ |
| Set an app age rating | https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/ |
| Categories | https://developer.apple.com/app-store/categories/ |
| Upcoming requirements | https://developer.apple.com/news/upcoming-requirements/ |
| Submitting | https://developer.apple.com/app-store/submitting/ |
| App Review | https://developer.apple.com/distribute/app-review/ |
| Submit an app | https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/ |
| iPhone apps on Apple silicon Macs | https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-macs-with-apple-silicon/ |
| Agreements | https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/ |
| Accessibility Nutrition Labels | https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/ |
| EU Digital Services Act trader requirements | https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/ |
| Export compliance documentation | https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption/ |
| Overview of export compliance | https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/ |
| Complying with encryption export regulations | https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations |
| `ITSAppUsesNonExemptEncryption` | https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption |
| Marketing guidelines and badge licence | https://developer.apple.com/app-store/marketing/guidelines/ |
| Apple trademark guidelines for third parties | https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html |
| Smart App Banners | https://developer.apple.com/documentation/webkit/promoting-apps-with-smart-app-banners |

### 17.3 Apple: the account and the platform

| Page | URL |
| --- | --- |
| Program enrolment (seller name, legal entity, no DBAs) | https://developer.apple.com/help/account/membership/program-enrollment/ |
| Updating your account information (conversion, vendor name) | https://developer.apple.com/help/account/membership/updating-your-account-information/ |
| D-U-N-S number | https://developer.apple.com/help/account/membership/D-U-N-S/ |
| Enrol | https://developer.apple.com/programs/enroll/ |
| Set your developer name | https://developer.apple.com/help/app-store-connect/create-an-app-record/set-your-developer-name/ |
| Remove an app | https://developer.apple.com/help/app-store-connect/create-an-app-record/remove-an-app/ |
| App transfer criteria | https://developer.apple.com/help/app-store-connect/transfer-an-app/app-transfer-criteria/ |
| Overview of app transfer | https://developer.apple.com/help/app-store-connect/transfer-an-app/overview-of-app-transfer/ |
| Token-based connection to APNs | https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns |
| Asking permission to use notifications | https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications |
| `NSFaceIDUsageDescription` | https://developer.apple.com/documentation/bundleresources/information-property-list/nsfaceidusagedescription |
| `UIDevice.name` | https://developer.apple.com/documentation/uikit/uidevice/name |
| iTunes search for 'tortie' (9 results, none named Tortie) | https://itunes.apple.com/search?term=tortie&entity=software&country=us |
| iTunes lookup of the bundle id (0 results) | https://itunes.apple.com/lookup?bundleId=com.itavero.tortie.phone |

### 17.4 Precedents and third parties

| Source | Date | What it shows |
| --- | --- | --- |
| Control Plane PR #52, https://github.com/lucive-apps/control-plane/pull/52 | Merged 30 September 2026, 13:41 UTC | Rejected under 2.1(a) because reviewers could not use it without a computer; a hosted review server returned 503; cured with a local demo mode. The developer's paraphrase, not Apple's letter |
| hermes-fleet issue #18, https://github.com/AIowa-LLC/hermes-fleet/issues/18 | Created 10 September 2026 | An unchecked plan for a reviewer gateway. Not a precedent |
| Superset, `/Users/gdc/superset/apps/mobile/RELEASE.md:55` and `:163-184`, `store.config.js:13` | August 2026 | A 4.3(a) rejection despite a demo account; "Reviewers will not install the desktop app." |
| Apple forums 815079 and 820096 | February and March 2026 | iPhone-only apps rejected under 2.1 on an iPad Air 11-inch (M3) |
| Apple forum 114795 | March 2019 | A 4.2.3 rejection cured by making part of the app work alone |
| Apple forums 781473 and 817891 | April 2025 and March 2026 | Conversions taking over 6 weeks; builds blocked mid-migration |
| Apple forum 756190 | May 2024 | A conversion that took "a week or two" |
| Apple forum 816961 | February 2026 | A DTS engineer: "you can upgrade your team to an Organization team later on" |
| Apple forums 66585 and 709285 | October 2016 and June 2022 | A TestFlight privacy URL demanded because of a HealthKit entitlement; metadata not needed for TestFlight review |
| Apple forum 781085 | April 2025 | Review text leaked onto a public link page through the Beta App Description |
| Apple forum 766486 | October 2024 | Apple asking a hardware app for a video on a physical device |
| Subsplash support article | 4 April 2024 | After migration "your legal entity name will apply to all apps"; the signing portal is unavailable during migration. Third party; URL not kept in the round |
| Michael Tsai, https://mjtsai.com/blog/2025/05/19/slow-testflight-beta-app-review/ | May and August 2025 | Beta App Review waits of 2 to 10 days |
| Bark, research 127 section 6 | 2018 onward | An APNs key shipped inside an app on the store |
| Happy, https://apps.apple.com/us/app/happy-codex-claude-code-app/id6748571505 | Read 30 September 2026 | Developer Tools, 4+ |
| Unified Remote, https://apps.apple.com/us/app/unified-remote/id825534179 | Read 30 September 2026 | Desktop server required |
| Steam Link, https://apps.apple.com/us/app/steam-link/id1246969117 | Read 30 September 2026 | Local network only, after a 2018 rejection (https://toucharcade.com/2018/05/24/apple-rejects-steam-link/, https://www.cnbc.com/2019/05/16/steam-game-streaming-app-debuts-on-iphone-and-ipad-a-year-after-controversy.html) |
| Immich, https://apps.apple.com/us/app/immich/id1613945652 | Read 30 September 2026 | Self-hosted server, 'Data Not Collected' |
| Remote Codetrol, https://apps.apple.com/us/app/remote-codetrol/id6755246569 | Read 30 September 2026 | 9+ |
| Mobile for Claude Code, https://apps.apple.com/sr/app/mobile-for-claude-code/id6763599135 | Read 30 September 2026 | 4+, types to an agent over the internet |
| T3 Code, https://apps.apple.com/us/app/t3-code-remote-claude-more/id6787819824 | Read 30 September 2026 | 12+, released 29 July 2026 |
| Claudette Echo, https://apps.apple.com/app/id6759467788 | Read 30 September 2026 | 'Data Not Collected' |

### 17.5 The tree and the site

The Tortie tree at `984b3163`: `ios/Tortie/Info.plist`, `ios/Tortie/Tortie.entitlements` (an empty
dictionary), `ios/Tortie/PrivacyInfo.xcprivacy` (nothing collected, no tracking),
`ios/Tortie.xcodeproj/project.pbxproj:342, 432, 437, 449, 450`, `ios/Tortie/Style/Copy.swift:132, 158, 185,
191, 214, 217, 230`, `ios/Tortie/Screens/SessionScreen.swift:3-7`, `ios/Tortie/Screens/DoorWords.swift:155`,
`ios/Tortie/App/TortieApp.swift:106`, `ios/Tortie/Door/Pairing.swift:13-19, 52, 98`,
`ios/Tortie/Door/DoorClient.swift:318, 341-350`, `build/conformance-ios.mjs:855, 865-875, 1175, 1199`,
`build/assert-simulator-teardown.mjs:91, 159`, `build/simulator-run.mjs:127, 130, 137, 689, 735`,
`build/p316/SPEC.md:103-104, 660`, `build/p316/CHECKLIST.md:14, 95`, `build/p330/CHECKLIST.md:87, 219`,
`src/main/pocket/bind.ts:13`, `src/main/pocket/pairing.ts:1124`,
`src/renderer/settings/PhoneSection.tsx:61, 72, 75, 97`, `src/main/menu.ts:615`, `electron-builder.yml:9`,
`LICENSE:1-3, 138-141, 189`, `README.md:9-16, 171-178`, `CHANGELOG.md:3-5, 12`,
`.github/workflows/release.yml:228-234`, `docs/BACKLOG.md:33326, 33462, 33464, 38211`, research 127 sections 6
and 11, research 128 sections 4, 5 and 9, research 132 sections 3.4 and 3.8.

His site repository, `/Users/gdc/tortiedotsh`, read only: `src/data/site-links.ts:1-2`,
`src/components/Download.astro`, `src/components/Footer.astro:24-33`, `src/components/AppleMark.astro`,
`src/components/InlineReleaseText.astro`, `src/pages/index.astro:28-30`, `src/data/docs.ts:137, 195-200`,
`src/data/comparison-catalog.ts:951-953`, `public/llms.txt:25`, `vercel.json`,
`scripts/sync-changelog.mjs:38-46`, `scripts/verify-site-routes.mjs`, `.github/workflows/refresh-changelog.yml`,
`DESIGN.md:104, 163`. Live checks on 30 September 2026: `tortie.sh/privacy`, `/support`, `/iphone`,
`/privacy-policy`, `/docs/privacy` and `/contact` return 404.
