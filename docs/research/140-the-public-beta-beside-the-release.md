# 140. The public beta beside the release: a public TestFlight link, so the Mac release stops waiting on Apple

Research 140. Written 6 October 2026 against the tree at `e3837139` ("docs(backlog): the late Prepare,
landed"). This is documents only. Nothing was installed, signed into, uploaded or run. No Electron, no
Simulator and no tmux was started, and no App Store Connect page or other signed-in page was opened. No
keychain, credential, APNs key, conversation store or live Tortie profile was read. Two processes did run,
and both are disclosed here: the judge ran `xcodebuild -version` once to check Xcode's labels (it printed
"Xcode 26.3"), and the writer ran it once by mistake with its output thrown away. Neither built anything. The
brief said to start no `xcodebuild`, and both runs broke that.

Every Apple claim quotes a public page read on 6 October 2026, from 22:18 UTC, and section 14 gives every URL.
Copies of the fetched text are in the session's scratchpad under `r140/investigator-a/`, `r140/investigator-c/`,
`r140/investigator-d/apple/`, `r140/adversary-1/`, `r140/adversary-2/` and `r140/judge/`, and are not in the
tree. Every precedent claim cites a `file:line` in a shallow clone under the scratchpad's `r140/repos/`
(commits in section 14.3), a public store lookup, or a page with its URL. Every Tortie claim is a `file:line` in
the tree at `e3837139`, in his site repository `/Users/gdc/tortiedotsh` (read only), or in the Phase 337.1 spec
at `/private/tmp/wt-p3371/build/p3371/SPEC.md`, which is in flight and was read only.

The round. Four investigators each owned a lens. A read Apple's rules as they stand today. B read how about
twenty other products ship a phone app beside a desktop app. C read the review risk now that the phone draws a
session's terminal. D read Tortie's own release lane, the phone checklists and the door. Two adversaries then
attacked all four reports, one on review and one on launch day. A judge ruled on every disagreement, and that
ruling is this document's spine. The writer checked the citations this document leans on against the tree and
the saved copies, and re-checked tortie.sh at 23:12 UTC.

It answers his question of 6 October 2026, in his words: "can you research what the best approach would be to
do that and how we could handle and ship that? weigh how others do it". "That" is his idea of a public
TestFlight link first, so the Mac release does not wait for App Store review. Research 136 (30 September,
"a public TestFlight link, then the App Store") is the starting point. Where 136 still holds, this document
cites its section and does not repeat it. This document is the delta.

## 1. The answer first

Yes. A public TestFlight link is the right way to stop the Mac release waiting on the App Store. Apple allows
it as a step toward the store, but not as a lasting replacement. The Developer Program License Agreement,
section 7.4, forbids "continuous distribution of demo versions of Your Application in an attempt to
circumvent the App Store".

The link does not skip review. Apple says "The first build you submit requires a full review, but later
builds for the same version might not." That first review, Beta App Review, usually takes about a day.
Runway's public tracker on 6 October showed 13h 57m waiting plus 1h 23m in review. Apple publishes no upper
bound. Since 19 September some teams have been blocked from submitting at all by an App Store Connect fault
named `BETA_CONTRACT_MISSING`. So the plan is to start Apple's clock as early as we honestly can, then do the
rest of the work while Apple reviews.

The route, in one paragraph. Build 7 goes up through Xcode's "App Store Connect" option, never "TestFlight
Internal Only", so it and every later build can join a public group. Five basics are made before anything goes
to Apple: the support mailbox, three pages on tortie.sh, the links inside the app, a check on an iPad and on
iOS 27, and his video as two clips. Build 8 then goes to Beta App Review without waiting for See a sample,
which follows in build 9. While Apple reviews, the CHANGELOG is rewritten for strangers, a gate makes the
door's answers only ever add, and the Mac release is tagged as a draft and checked against his phone. On
approval, or three working days after submission, whichever comes first, the link opens, tortie.sh/iphone
points at it, and the Mac release is promoted, all on one day.

The findings that change what gets built:

- After Phase 337.1, tapping a session opens its live terminal. That makes research 136's "no raw terminal,
  ever" lines (136:85, 327, 353-361, 729), its 4.2.7 rating and its drafted texts out of date (section 2).
- It does not block the beta. Many live apps show a terminal of the person's own computer, and no rejection
  under guideline 4.2.7 was found anywhere. But the evidence is thin, and if 4.2.7 ever fires there is no cure.
  The only defence is to describe the terminal plainly and never hide it (sections 3 and 5).
- See a sample is now about twice the work, and it is insurance rather than a gate. CC Pocket has been on the
  store since 6 March 2026 with no public sample until 1 October; its notes and a video passed review again
  and again (section 4).
- Every phone checklist since build 1 says to upload as "TestFlight Internal Only", and such builds "can only
  be added to internal tester groups". Build 7 has not been uploaded yet, so fixing this now costs nothing.
- tortie.sh/iphone, /privacy and /support return 404, and tortie.sh has no mail record, so mail to
  support@tortie.sh cannot be delivered. The Mac already prints "from tortie.sh/iphone".
- Adding any route to the phone door turns off every paired phone until its owner presses Allow on the Mac,
  and nothing tells them. For strangers this becomes routine after launch. A gate and a design change are new
  entries (333.11 and 333.12).
- The door has never run inside a signed, notarized Tortie, which is the only Tortie a stranger gets. The
  release-candidate check pairs his phone against the draft's DMG before it is promoted.

What he can start today, at no cost: create support@tortie.sh and send it a test message; check on the
Agreements page that the License Agreement revision of 18 August 2026 is accepted; and, when build 7 is ready,
upload it through "App Store Connect" (section 9).

His four answers of 30 September still stand (`docs/BACKLOG.md:41128`): his individual account for the beta
with "© 2026 Ita Vero, LLC"; alerts his alone; "In-app sample, plus your video"; and a new support@ mailbox on
tortie.sh. His stop of 1 October (`docs/BACKLOG.md:41174`) still holds 333.1 to 333.10 until his word. The
Terminal changes only when the sample is ready in the sequence, which is question 2 in section 13.

## 2. What changed since research 136

### 2.1 The Terminal

Research 136 was written when the phone drew only structured records. Since then:

- Phase 337 landed as `d3d59055` on 6 October (`docs/BACKLOG.md:41262`). The phone draws a session's own screen
  natively, from rows of text the Mac composes, and types into it with every key, Ctrl-C included, with no Face
  ID (`CHANGELOG.md:19`). His ruling of 5 October lifted "no raw terminal" for a session's own screen
  (`docs/BACKLOG.md:41226`).
- Phase 337 kept three cushions for App Review: Conversation opened first, the feature was called "Screen",
  and it never scrolled back (`build/p337/SPEC.md:1449-1450`). Phase 337.1, in flight, removes all three. His
  ruling "lets do B": "Tapping a session in a list opens its live terminal at once, full screen", Catch Me Up
  becomes an icon, and "The terminal is named Terminal in the app" (p3371 `SPEC.md:38-44`). His ruling "Yes,
  scroll back on the Screen" lifts his 316 refusal of raw scrollback (p3371 `SPEC.md:34-36`). Its D22 removes
  the line "The terminal's scrollback stays on your Mac." because "after this phase it is false".
- The honesty sentence the Mac shows at Allow becomes "A phone you allow can see what any session's terminal
  shows and what it printed before, type into it as you would at this Mac, ..." (p3371 D35, over
  `src/shared/ipc/pocket.ts:1054-1056`).

So the terminal is now the app's main surface. These parts of research 136 are superseded by his 337 and
337.1 rulings, and a later round reads this document first:

| Research 136 | What it says | Now |
| --- | --- | --- |
| 136:85 | "a raw terminal on the phone, ever" stays refused | Lifted by his rulings of 5 October |
| 136:327 | 4.2.7 risk "Low while no terminal reaches the phone"; "No raw terminal, ever" | A terminal reaches the phone; the risk is unknown with no cure (section 5) |
| 136:353-361 | "why 'no raw terminal' is now absolute" | Superseded. The reasoning about clause (a) and Funnel still holds (section 5) |
| 136:535 | the `[337: ...]` brackets assume "Conversation the first-run default" | Reversed by "lets do B" |
| 136:729 | to 318, "Add no raw terminal" | Superseded |
| 136 §12.1 to §12.5 | the drafts lead with "structured records" and treat the screen as an "also" | Replaced by section 10 |
| 136:242, 271 | Beta App Review "2 days to 10"; "90% of submissions are reviewed in less than 24 hours" | Out of date (section 3) |
| 136:640 | "no crash reporting" on the privacy page | Wrong under TestFlight (section 3) |
| 136 §14, last paragraph | the door's routes change "only by adding" | Not enough: adding a route itself turns off every paired phone (section 7.3) |

The brief for this round let the writer create this document and nothing else, so research 136 itself is not
edited. A one-line note beside those lines in 136 pointing here is the main session's call, under the
backlog's in-place exception.

### 2.2 Everything else that moved

- Phases 316.5 (alerts, `f90ff8cc`), 316.6 (tabs, `b7cf94f3`), 316.7 (the Sessions tab, `851b3c4c`), 317 (End
  behind Face ID, `467b4e4a`) and 318 (Reply, `42becaeb`) all landed. The CHANGELOG's Unreleased section holds
  24 items, every one with its commit link, and 184 commits since v0.110.0 of 21 September.
- Phase 333.2 landed as `ac9c1e45`. The Mac now says "Scan it with Tortie on your iPhone, from
  tortie.sh/iphone." (`src/renderer/settings/PhoneSection.tsx:88`), and that page returns 404.
- Three of 136's risk rows closed: the Face ID purpose string is in `ios/Tortie/Info.plist:27-28`; the phone asks
  for alerts only when its Mac can send (316.5); and the held composer stays retired.
- Phase 336 removed the remote write grant, so `README.md:160` ("Editing is off until you switch it on") and
  `/Users/gdc/tortiedotsh/src/data/docs.ts:259` ("writes disabled until you approve a root") are now false.
- His first pairing through Funnel worked on 30 September, and the first code took about 7 to 8 minutes while
  his Mac's public name settled (`docs/BACKLOG.md:41130`).
- Builds 1 to 6 went to his own phone through internal testing. Build 7 has never been uploaded and follows
  337.1 (p3371 D34, `build/conformance-ios.mjs:2985`).
- The route list grew from 8 to 10 with 337, and 337.1 adds an eleventh, `scrollback` (p3371 D1). Every phase
  that added a route asked him to press Allow again (`CHANGELOG.md:16`, `:18`, `:19`, and the build 6 line at
  `docs/BACKLOG.md:41212`).

## 3. Apple's rules today, and what moved since 30 September

The App Review Guidelines have not changed. Today's page ends "Last Updated: June 8, 2026", and the text from
"Before You Submit" to "Last Updated" matches Wayback captures of 30 September and 5 October line for line.
What moved is Apple's stated review time, an operational fault, and Apple's help pages that 136 did not use.

| Rule | What Apple says, read 6 October 2026 | Moved since 30 September? |
| --- | --- | --- |
| TestFlight is a path to the store | License Agreement 7.4: TestFlight is for "pre-release versions ... solely for their testing and evaluation"; "continuous distribution of demo versions of Your Application in an attempt to circumvent the App Store ... are prohibited uses". Guideline 2.2: a beta "should be intended for public distribution" | Not new text, but 136 did not cite it. It is why the store lane starts after launch |
| Apple can stop it | License Agreement 6.5: Apple may require You "to cease distribution of Your Application through TestFlight ... at any time in its sole discretion" | Not cited by 136 |
| The first external build is reviewed | "The first build you submit requires a full review, but later builds for the same version might not." "You can only have one build of each version in review at a time." | Unchanged |
| A significant change is reviewed again | License Agreement 6.5: an update with "significant changes" must be flagged "and have such Application re-reviewed". Guideline 2.2 says the same | Not cited by 136. The Terminal must be in the first build reviewed, and described |
| Internal Only builds stay internal | "Builds uploaded as TestFlight Internal Only from Xcode or Xcode Cloud are marked as internal under the build number and can only be added to internal tester groups." | Unchanged. Xcode 26.3 names the right option "App Store Connect"; Apple's Xcode documentation calls it "TestFlight & App Store" |
| How long review takes | "App Review works around the clock, typically reviewing at least 50% of submissions in less than 24 hours and 90% in less than 48 hours." No figure for Beta App Review | Changed. Captures of 25 September and 3 October read "On average, 90% of submissions are reviewed in less than 24 hours." 136:271 is out of date |
| Beta App Review in practice | Runway, two-week means over its own customers: TestFlight waiting 13h 57m, in beta review 1h 23m; App Store waiting 7h 13m, in review 2h 4m. Forum 819916 (March 2026): 32 hours to more than a week | New data. 136:242's "2 to 10 days" came from 2025 blog posts |
| A fault that blocks submission | Forum 848325 (19 September): "External submission returns ENTITY_UNPROCESSABLE.BETA_CONTRACT_MISSING through both the App Store Connect website and the public App Store Connect API". Forum 848226 reports other teams at the same time. Threads 848666, 849154 and 849738 follow. No Apple reply | New. It shows only at the first external submission |
| Support and privacy links | "A link to user support with up-to-date contact information and a link to your privacy policy is required for all apps." Guideline 5.1.1(i) wants the privacy link inside the app too | Unchanged. The pages still 404 |
| What the notes should say | App Review Help: list "Devices and OS versions tested" and the "External services and platforms" the app uses | New to this lane |
| A video | "If features require an environment that is hard to replicate or require specific hardware, be prepared to provide a demo video or the hardware." App Review Help: "Apps with required hardware must provide a video (not a screen recording) that shows your app running on a physical Apple device as it pairs and interacts with the hardware." | The second sentence is new to this lane. Whether Apple counts a Mac as "required hardware" is not known, so the route sends both kinds |
| Hiding features | App Review Help lists "attempting to hide features in review. (Guidelines 2.3.1(a) and 5.6.3)" among the signals that start an investigation | New to this lane. It rules out playing the Terminal down |
| Metadata | 2.3: metadata must "accurately reflect the app's core experience". 2.3.1(a): new features "described with specificity in the Notes for Review" | Unchanged text; the app changed, so 136's drafts no longer comply |
| Code on the phone | 2.5.2: apps "may not download, install, or execute code which introduces or changes features or functionality of the app" | Unchanged. Not listed by 136, which had no terminal |
| Third-party AI | 5.1.2(i): "You must clearly disclose where personal data will be shared with third parties, including with third-party AI" | Unchanged text. With the Terminal it covers every key typed, not only a 318 message |
| Remote desktop | 4.2.7 binds an app that "acts as a mirror of specific software or services rather than a generic mirror of the host device"; (a) needs "a local and LAN-based network"; (b) needs the software "rendered on the screen of the host device" | Unchanged text. Section 5 re-rates it |
| Testing on iPad | "Apps designed for iPhone can run on iPad in compatibility mode." "Don't submit for review without testing your app's behavior in compatibility modes." | New to this lane |
| Crash reports | "TestFlight users of your app automatically share crash reports with you, regardless of the device settings for sharing diagnostic and use data." Testers are told "Apple will collect and send crash logs, your personal information such as name and email address, usage information, and any feedback you submit to the developer" | Not cited by 136. 136:640's "no crash reporting" is wrong under TestFlight |
| Screenshot feedback | "You can disable the ability for tester groups to take screenshots and submit feedback directly from your beta app, including details about crashes." Email feedback still works | New to this lane. Crash logs still arrive; only the tester's in-app screenshot and comment stop |
| The link's page | The page shows the Beta App Description word for word. A closed or full link shows one sentence and no app name, for example "This beta isn't accepting any new testers right now." | Answers 136 §15's open item |
| Testers and builds | Up to 10,000 external testers. "Each build is available to test for up to 90 days", and "you'll no longer be able to open the beta build" after that. Mac and Vision Pro testing is switched on per group | Mostly unchanged; "will not open" is new |
| Platforms | iPhone Duo on sale 23 October on iOS 27.1; an iOS 26 SDK build runs on it "in the center of the display, with empty space surrounding the window". Xcode 27.1 RC uploads accepted since 5 October. Duo screenshots required from April 2027 | New dates |
| Export compliance | Apple's table links "No export compliance documentation required" with setting the Info.plist key so the questions stop | Narrows 136 §6.3. His default, answering on each upload, stands |
| Mac signing | Apple news, 1 October: "The original Developer ID Certification Authority (Sub-CA) expires on February 1, 2027". Notarized apps with a secure timestamp keep working; installer packages are the ones affected, and Tortie ships none | New. Whether his signing certificate came from the old authority is not settled |

One inference that changes the order of work. The Mac release needs only Developer ID signing and
notarization, with no human review. Only the phone link waits on Beta App Review. So Apple never required the
two to go out on one day. That was his ruling of 21 September, "half of it shipped is a changelog describing a
door with nothing behind it" (`docs/BACKLOG.md:40992`), and question 1 in section 13 asks him to weigh it
against "so we don't block on the app store".

## 4. How others ship

Read on 6 October 2026 from shallow clones, public store lookups (`itunes.apple.com`), public TestFlight link
pages and the Internet Archive's index. Nothing of theirs was installed, built or run.

| Product (seller) | How the phone reaches people | Did the desktop wait for the phone? | How the reviewer got in | Recorded rejections and cures | What Tortie takes |
| --- | --- | --- | --- | --- | --- |
| CC Pocket (an individual) | US store since 6 March 2026 (lookup 6759188790). A public offline demo first shipped in 1.140.0 on 1 October (`ccpocket/CHANGELOG.md:14-19`) | No | Notes plus a video for seven months: "Without a Bridge Server, the app's functionality is limited to the connection and settings screens" (commit `9508db60`), later "please refer to the attached demo video" | None found | A video and honest notes can carry 2.1 at the store. A chat-first app, so not proof for a terminal-first one |
| Cmux Remote (an individual) | Store, 4+ (lookup 6769380881) | Not its own desktop | A Demo Mode in Settings (`cmux-remote/docs/launch-assets/asc-metadata.md:307-335`). Tells Apple "Nothing leaves your private network" | 5.2.5, cured by writing "computer" for Mac and "this mobile app" for iPhone (`release-notes/1.0.9.md:3-13`) | Trim repeated Apple product names from store text (333.9) |
| Superset (a company) | Store since 9 September 2026, 17+ (lookup 6788926383) | No | A hosted demo account with sample sessions (`apps/mobile/store.config.js:23`). A 2.5.2 line written up front (`:34`) | 4.3(a) on the first 1.0 submission, August 2026 (`RELEASE.md:175-177`), cured on identity, a recording and a request for a call | Identity-first notes, a 2.5.2 line, and its warning: "Removing a feature to 'get past' a reviewer, then re-adding it the next release. It works once and then the app is flagged." (`RELEASE.md:213-214`) |
| cmux, official (a company) | External TestFlight to paid groups only; not on the store (lookup 6783338052 empty in four countries) | No; the desktop kept shipping | A hosted review Mac and demo account, then a demo flagged on its server (PR 11289) | 2.1(a) repeatedly, because the review Mac "intermittently 429s"; 2.5.2 answered by wording (`ios/AppStoreReview/reviewer-setup.md:77-81`); 404 Terms and Privacy links caught (PR 17029) | A host that can fall over fails review. Links must not 404. It also sells subscriptions, so it is not a clean data point about terminals |
| Control Plane | Not found on the store | No; it drafted a "Join the TestFlight beta" card (PR 41) | Its notes sent the reviewer to a hosted server that "returned 503", then a local demo (PR 52, merged 30 September) | 2.1(a), for a broken host, not for lacking a sample | The outcome of the resubmission is not found |
| Orca (Lovecast LLC) | Store about weekly, public TestFlight daily, both linked from the desktop (`src/renderer/src/components/mobile/mobile-platform-copy.ts:4-21`) | No | Not found. Its store text says "on your local network only" and "same Wi-Fi" | None found | Its desktop button links straight to TestFlight, which today reads "This beta is full." Publish only an address we control |
| T3 Code (T3 Tools, Inc.) | Store plus a nightly TestFlight: "Nightly builds need the beta app. The store apps cannot connect to them." (`docs/user/install.md:107`) | No | Not found | None found | Its workflow sees later builds of a version "auto-approve until that version is released" (`.github/workflows/mobile-eas-production.yml:9-18`) |
| Paseo (an individual) | Beta App Review on every beta tag, an external group with no public link; the store on stable tags (`docs/release.md:192`, `:313`) | No: "The app and the daemon are separate products that ship separately" (`docs/protocol-compatibility.md:3`) | Not found | None found | "Never flip optional to required, remove a field, or narrow a type." (`:16`). The model for 333.11 |
| Home Assistant, Happier | A redirect on their own domain: `www.home-assistant.io/ios/beta/` to the TestFlight link; `happier.dev/appstore` to the store | Not applicable | Not applicable | Not applicable | The model for tortie.sh/iphone: the address moves from a holding page to TestFlight to the store with no Mac release |
| Termius, Home Assistant, Swiftfin | Public links still open since 2019, 2020 and 2024 (Internet Archive first captures) beside a store app | No | Not applicable | Not applicable | A link can last years; a build cannot |
| Tactic Remote, PixelHQ, Shunt | TestFlight first: Tactic's beta from January 2026 reached the store on 31 March; PixelHQ's in days; Shunt lists TestFlight as its only iPhone route | No | Tactic's public page said "Reviewers can tap 'Try Demo Mode'" | None found | Keep review text out of the Beta App Description. Tactic's closed link now names nothing |

The weighing. Nobody found holds a desktop release for the phone's review, and no precedent requires the two to
ship together. A held release would leave no public trace, so this shows only that others did not couple
them. In Tortie's own category TestFlight first is common, and those betas tend to end the way Tactic's did,
with a closed page that names nothing. Mature products keep a public link beside the store for years, as a
faster channel, so the public group need not be retired when the store arrives. What passed review for
companions with no account was either a sample inside the app or honest notes with a video; what failed was
review access that broke. Tortie cannot use a hosted door anyway: pairing needs a person to press Allow
(`ios/Tortie/Style/Copy.swift:264`) and the code expires after 3 minutes (`src/main/pocket/pairing.ts:1161`).
Beta App Review checks that an app works more than it checks product questions: in forum 848256 Beta App
Review approved every build while the store rejected the same app six times. So the first beta review is most
likely to fail on access or on something broken on the reviewer's device, and 4.3 is mostly a store-stage
risk. Individuals sell most of the approved agent companions (CC Pocket, Happier, Termix, Paseo, Cmux Remote,
CmuxPhone, Nodeterm), so his individual account does not hold the beta back.

## 5. The review risks, ranked

| Rank | Risk | Likelihood | The answer | Before the first submission? |
| --- | --- | --- | --- | --- |
| 1 | The basics are missing: /privacy, /support and /iphone return 404, support@tortie.sh cannot receive mail, and the app has no privacy link (5.1.1(i), 1.5) | Certain if left | 333.5's pages live, the mailbox made, the links in 333.1 (build 8) | Yes |
| 2 | Stale texts: 136's drafts describe an app without the Terminal (2.3, 2.3.1(a)); five CHANGELOG clauses are false for strangers | Certain if left | Section 10's drafts; the CHANGELOG rewrite in 333.7 before the tag | Yes for the review texts |
| 3 | The reviewer cannot use an app that needs a Mac (2.1) | Medium | Two video clips and notes that answer Apple's items; See a sample in build 9, resubmitted at once if build 8 is rejected under 2.1 | Yes, the clips and notes |
| 4 | Something is broken on the reviewer's own device: an iPad in compatibility mode, or iOS 27 | Medium. The app has never run on either; the Terminal has no hardware-key handling (no `pressesBegan`, `UIKeyCommand` or `keyCommands` under `ios/Tortie`) and 337's keyboard fix was for iOS 26.3 only | 333.4's narrow first pass on build 8, and the devices-tested line in the notes | Yes |
| 5 | 4.3 spam: a crowded category, and 88 stars on `gregce/tortie` against Superset's 13,000 or more | Medium at the beta, high at the store | Notes that lead with identity, the name "Tortie" alone, and a reply plan written in advance: identity, a recording, a request for a call | Yes, as text |
| 6 | 4.2.7, read as a remote desktop app. It would fail clause (a), a local network, because the door binds `127.0.0.1` and is reached only through Funnel (`src/main/pocket/bind.ts:13`, `funnel.ts:591`), and clause (b), shown on the host's screen, because sessions run in a private tmux server | Unknown. No rejection of a terminal companion under 4.2.7 was found, but only four companions publish review records, and the two that use 4.2.7's own word "mirror" tell Apple they stay local or private | Say "terminal" plainly, add one 2.5.2 line, and have the reply plan ready. Never hide or remove the Terminal to pass review | Yes, as text |
| 7 | 2.5.2, a reviewer asks whether code runs on the phone | Medium | One sentence: nothing is downloaded or run on the phone, and every command runs on the person's own Mac. The sample's keys only echo | Yes |
| 8 | Privacy: a tester's screenshot feedback carries terminal contents to Apple and to him; a stranger's Mac name, often a first name, becomes public in DNS | Medium | Screenshot feedback off for the public group; sentences on the privacy and support pages | Yes |
| 9 | A stranger with an Intel Mac or an old Mac release can never pair | Medium on launch day | The Beta App Description and the pairing screen name Apple silicon and the Mac version | Yes |
| 10 | Beta App Review is slow, or blocked by `BETA_CONTRACT_MISSING` | Medium | Submit as early as the basics allow; tag the Mac draft during the wait; promote on approval or after three working days | No |
| 11 | The door has never run in a signed, notarized Tortie | Unknown, never tried | The release-candidate check on the draft's DMG | No, before the promote |
| 12 | A Mac update that adds a route turns off every stranger's paired phone, and nothing says so | Certain on the first route-adding release after launch | Words before launch (333.1, 333.5); 333.12 before any route-adding phase | No |
| 13 | A later Mac release removes a field the phone requires, and an older phone refuses every answer | Low per release, cumulative over 90-day builds | 333.11's frozen-answer gate, before the launch tag | No |
| 14 | A stranger imports their own push key and is asked for an alert permission that can never work | Low to medium | 333.1's Mac line saying only the publisher can send alerts for now | No |
| 15 | A build expires after 90 days, or the link closes, and Apple's page names nothing | Certain on a gap over 90 days | A new approved build every 75 days at most; tortie.sh/iphone is the only address published | No |
| 16 | TestFlight kept in place of the store (License Agreement 7.4), which Apple can stop at any time (6.5) | Low now, rising with time | The store lane starts after launch, with submission before build 8's 90 days end | No |

The 2026 "Guideline 2.1 - Information Needed - New App Submission" request, which asks an account with little
review history for a screen recording on a physical device "running the latest operating system", appears in
every case found at an App Store submission (spliit2go #184, iOSSH #48 and three more), and in none at Beta
App Review. It belongs to 333.9. The clips made for the beta serve both if his iPhone runs iOS 27 when he
records them.

## 6. Launch day for a stranger

| Step | What they do | What can go wrong | The answer |
| --- | --- | --- | --- |
| Find it | Read "from tortie.sh/iphone" in Settings then Phone, or follow it from tortie.sh or the README | Most strangers' Macs are still on 0.110.0, which has no Settings then Phone, because the Mac checks every 6 hours and installs only on quit (`src/main/updates/updater.ts:125-127`, `:421-422`), and Tortie is an app people leave running | The Beta App Description and the pairing screen name the Mac version, "0.111 or later", and Apple silicon. The support page says to quit Tortie to finish an update |
| Install | Open the link on the iPhone, install TestFlight, then Tortie | A full or closed link shows one sentence and no app name | tortie.sh/iphone, never a direct link, is the only address published, so it can say what is wrong |
| Meet the phone app | The pairing screen: "In Tortie on your Mac, open Settings then Phone and press Pair." (`Copy.swift:254`), and "There is nothing else to install." (`:270`) | Neither names the Mac version; an Intel Mac can never pair (`electron-builder.yml:1`, "A signed arm64 DMG and ZIP") | 333.1's version and Apple silicon line |
| Tailscale | Install Tailscale and sign in (`src/shared/ipc/pocket.ts:1124-1125`) | Signing in means making a Tailscale account, so "no account" is true of Tortie only. The App Store version of Tailscale has never been driven with Funnel (research 132 §3.1), and a non-admin's `tailscale funnel` can exit 0 having published nothing (research 132 §3.3) | The support page names both. One outside rehearsal before the link opens is worth it if he can arrange one |
| Approve Funnel | Tailscale's page, once per tailnet | Its host and clicks are unmeasured: his tailnet was approved from Terminal (`docs/BACKLOG.md:41130`). A wrong guess degrades to text (`src/main/pocket/funnel.ts:129`, `:596-617`) | Stated as not settled |
| Wait for the name | Settings then Phone shows progress (Phase 332.1) | His first code took 7 to 8 minutes | The support page says it can take several minutes |
| Pair | Pair, scan, match the groups, Allow | Nothing new | As today |
| Use it | Tap a session; its terminal opens | A Mac update later that adds a route leaves only "Tortie could not reach your Mac." (`Copy.swift:668`) | 333.1's line; the support page; 333.12 after launch |
| Privacy | The door is on | Their Mac's name is public in DNS while it is on (research 132 §3.8, `docs/BACKLOG.md:41076`). A lost phone or an expired build leaves the door published, and the Mac keeps no record of a phone's last read (`src/shared/ipc/pocket.ts:809-832`) | The privacy and support pages say how to rename the Mac in Tailscale, and how to cut a phone off: Remove it, or switch the door off, at the Mac |
| Report a problem | TestFlight's feedback, or email | Public-link testers are anonymous unless they choose otherwise, so the feedback email is the only way to reply. The phone cannot tell us the Mac's version | support@tortie.sh as the feedback email; What to Test asks for the Mac's version |

On the Mac, a stranger who is a developer meets one more trap. The Alerts card shows "Choose…" for an Apple
push key (`src/renderer/settings/PhoneSection.tsx:212-223`). The Mac stamps his team on any key it is given
(`src/main/alerts/key-file.ts:103`), so a stranger's own key turns the switch on, their phone is asked for a
permission, and Apple refuses every alert (`src/shared/push-copy.ts:27`). 333.1 gains one line on that card.

## 7. The Mac release and the phone build together

### 7.1 Versions

The phone stays at 1.0.0 with rising build numbers for the whole beta (`ios/Tortie.xcodeproj/project.pbxproj:417`,
`:427`). The Mac goes from 0.110.0 to the next minor release, likely 0.111.0 (`package.json:4`). The two numbers
are not linked and should stay that way. Compatibility is a property of the wire, not of version numbers.
Neither side sends the other its version today: there is no version field in `src/shared/ipc/pocket.ts`, and
the phone's Settings reads only its own bundle (`ios/Tortie/Screens/SettingsScreen.swift:86-87`). One optional
later addition: the door could carry the Mac's version in an answer it already sends, which adds no route.

What each side does with the other today. A newer Mac is tolerated by an older phone, because "Unknown fields
are ignored" (`ios/Tortie/Door/Contract.swift:12`). An older Mac makes the phone fall back to older screens
without saying so (`ios/Tortie/Screens/SessionsScreen.swift:430`). Paseo chose the opposite, "tells the user to
update the host" with "No fallback paths" (`getpaseo_paseo/docs/protocol-compatibility.md:35-37`). Tortie's
silent fallback keeps his no-regression rule and is kept.

### 7.2 Order

1. Build 8 is archived from a commit, and the Mac tag is cut from a commit whose `POCKET_ROUTE_IDS`
   (`src/shared/ipc/pocket.ts:98`) equal build 8's. Main keeps moving (340.1 and 342 landed or in flight, 318.1
   queued), and a Mac tag with different routes either drops the phone back to older screens silently or sends
   every stranger to Allow on day one.
2. The tag runs the release lane: checks, signing, notarization, then a draft only
   (`.github/workflows/release.yml:229-230`), in about 22 minutes. Tagging early costs nothing, because nobody
   gets a draft.
3. The release-candidate check. The door has never run in a packaged Tortie: the phone checklists start the
   Mac with `npm run dev` (`build/p330/CHECKLIST.md:40-46`), and the lane's packaged check is `GMUX_SMOKE=basic`
   only (`release.yml:176-179`). He installs the draft's DMG, pairs his phone and runs research 27 §3.7's
   checks. If it fails, the draft is deleted and the tag is cut again; users stay on 0.110.0, so nobody is worse
   off.
4. Launch day on approval, or after three working days with a holding page (question 1).

There is no staged rollout. Each running Mac reads the update feed about every 6 hours, so v0.110.0's 510 feed
downloads in 15 days come from roughly ten Macs (`updater.ts:125-127`; the update ZIP was fetched 17 times), and
`updater.ts:79` still reads "There is one user".

### 7.3 Routes, and why adding one is not harmless

The route list is one confirmed field (`src/main/pocket/pairing.ts:342`, shown at `:445`). "A MOVED FIELD NEVER
RESTARTS" (`src/main/pocket/ipc.ts:1149`): at launch the door stays shut and the only record is a log line
(`ipc.ts:1303`), and the launch result is thrown away (`src/main/capabilities.ts:455`). Allow lives only in
Settings then Phone, and the phone says only "Tortie could not reach your Mac." (`Copy.swift:668`). Updates
install on quit, a macOS restart included, so a stranger's phone can go dark while they are away from the Mac,
which is exactly when they need it.

Before launch the answer is words: 333.1, 333.5 and every release item that adds a route. After launch, 333.12
must land before any phase that adds a route. Phase 318.1 adds a read and a write; Phase 338 would add a
stream. One direction that keeps refusal 8 was named in the attack: hash each route separately, so a Mac
update keeps serving the routes already allowed and refuses only the new one until Allow. Taking routes out of
the hash is not an option. 333.12 is a research lane first.

### 7.4 Expiry

A build expires 90 days after upload and then will not open. A public link has no stated expiry; links have
been observed open for years. So a newly approved public build goes out at least every 75 days, and each
build's upload and expiry dates go in its running-log line. The store submission goes in before build 8's 90
days end. His pause of 1 October stops the queue before 333.1, so it strands no public tester.

### 7.5 Feedback and crashes

- Crash reports arrive by themselves from every TestFlight tester and stay downloadable for 120 days, with
  symbols, because the "App Store Connect" option uploads them. No third-party code is needed; Tortie ships
  none.
- In-app screenshot feedback is switched off for the public group, so a stranger's terminal is never
  photographed to Apple and to him. Testers can still email.
- The feedback email is support@tortie.sh, which is also the reply-to on invitations.
- Mac problems go to GitHub issues, as 136 §12.6 says.

## 8. The revised 333 plan

| Order | Entry | Verdict | What |
| --- | --- | --- | --- |
| 0 | 333.2, the Mac says where to get the phone app | Keep | Landed (`ac9c1e45`) and still right. tortie.sh/iphone shows 333.5's holding page until the link exists, so no Mac release points at a 404 |
| 1 | Build 7's upload method | New | A line in the main session's hand-off note for build 7, and the first row of a new `build/p333/CHECKLIST.md`: upload through "App Store Connect", never "TestFlight Internal Only"; if Xcode offers to change the build number, stop. `build/p316/CHECKLIST.md` is not used: it still runs `vendor:tailscalekit`, which no longer exists, and expects TailscaleKit lines from `--read-app` |
| 2 | 333.5, privacy and support pages | Change | Live before the first submission, not on launch day, with a holding page at tortie.sh/iphone naming the Mac version and Apple silicon. The privacy page gains the Terminal, every key typed, crash reports and feedback under TestFlight, the public Mac name, and how to cut a phone off. The support page gains Apple silicon, the Mac version, pressing Allow again after an update, the Tailscale non-admin case, the wait, and that alerts are not offered yet (section 10.4). His site repository, on his word |
| 3 | 333.1, a stranger's first run on both sides | Change | Rework before building; ships as build 8. Phone: Privacy, Support and "Tortie for Mac is free at tortie.sh" in Settings and on the pairing screen, through the existing LinkPolicy route or a rule (z) widened by name for exactly those https addresses (`build/conformance-ios.mjs:280-290` refuses a SwiftUI `Link(` today); the Mac version as "0.111 or later" and Apple silicon on the pairing screen; one line under "could not reach your Mac" about Allow; the wrong-version sentence kept at low priority, since no public Mac sent v:1 or v:2; never "beta" or "TestFlight". Mac: the Alerts card says only Tortie's publisher can send alerts for now. Drop items 5 and 6, which 316.5 and CLAUDE.md already did. Take the next free rule letter after 337.1. Re-read every citation: today they are `DoorWords.swift:379`, `Copy.swift:293` and `Pairing.swift:63`, `:105-109`. Tier 2 |
| 4 | 333.3, See a sample | Change | Starts when 333.1 lands (both edit `Copy.swift`); ships in build 9; off the link's critical path. The sample reader answers every `DoorReading` member (`ios/Tortie/Screens/DoorWords.swift:67-140`). A tap opens a fictional Terminal made by the shipping composer, with one page of fictional history, naming no agent maker, banner, model, billing line or test path; the only canned screen today, `build/fixtures/screen/sample-claude-2.1.287.json`, shows a `/private/tmp` path and three "Interrupted" lines and looks broken. Keys and Ctrl echo on the sample's own prompt; Return draws one fixed line saying nothing ran, never a shell's answer (2.5.2). The question buttons, the Catch Me Up icon and the Sessions tab's groups. End behind the real check, acting on the sample's copy; with no passcode set it shows what End would have done, because the real path says "Set a passcode on this iPhone ..." (`Copy.swift:513`, `App/OwnerCheck.swift:111-113`). "Sample" on every page. No network, no keychain, no "beta" or "TestFlight". The next free rule letter |
| 5 | 333.4, the devices App Review uses | Change | Two passes. Pass 1 on build 8: what a reviewer reaches without a Mac (pairing, the camera prompt, Settings, the links) and the paired Terminal, on an iPad Air 11-inch (M3) in compatibility mode with landscape and the key bar, iOS 26.3, iOS 18.3 and iOS 27 (he installs its runtime under ruling 9, or the row is stated unmeasured); a hardware keyboard and VoiceOver measured; the devices-tested line for the notes written. Pass 2 repeats over the sample in build 9. Keep the no-Face-ID and no-passcode rows. iPhone Duo waits for the store |
| 6 | 333.6, the public beta's texts, checklist and Beta App Review | Change | Earlier, and terminal-first (section 10). His checklist in `build/p333/CHECKLIST.md`: an external group "Public" with in-app screenshot feedback off, Mac and Vision Pro off, export compliance as before, build 8 added (which submits it), and on approval a public link open to anyone with no cap. The reply plans for 4.3 and 4.2.7 written in advance |
| 7 | 333.11, the door's answers only add | New | When the launch Mac release is cut, freeze its vectors, the keys the phone requires in each answer, and the route list. One gate on every commit asserts the composer still sends every frozen key and the door still serves every frozen route (a new Mac with an old phone); the phone tests decode the frozen answers (an old Mac with a new phone). Today `Contract.swift:12-17` refuses a whole answer when a required key is missing, and nothing stops a Mac release removing one. Mac side, Tier 2, before the Mac tag |
| 8 | 333.7, launch day | Change | Splits. Before the tag: rewrite Unreleased for someone coming from 0.110.0 (merge the phone items into a few true sentences; drop "It only reads and ends sessions" at `CHANGELOG.md:12`, the pair-again clause at `:13` and the three re-allow clauses at `:16`, `:18`, `:19`; reduce alerts to one clause or drop it; keep every commit link); correct `README.md:160` and tortiedotsh `src/data/docs.ts:259` for Phase 336; add an iPhone line to the README; tag from a commit whose routes equal build 8's; the release-candidate check. Launch day: tortie.sh/iphone to the link, promote, merge site and README, start the site's changelog refresh by hand. If the timebox ends first, promote with the holding page and a clause saying the iPhone app is in Apple's review. No staged rollout |
| 9 | 333.12, a Mac update never silently turns off a paired phone | New | Before launch, words only (333.1, 333.5, release items). After launch, before any phase that adds a route (318.1, 338): a research lane, attacked before it is built, then a build. Goal: routes already allowed keep working and only the new one waits for Allow, keeping refusal 8 (`pairing.ts:342`, `:445`; `ipc.ts:1149`, `:1291-1305`) |
| 10 | 333.8, store frames | Keep | Store only, after the link. Any frame of the Terminal uses the sample's fictional screen |
| 11 | 333.9, the store listing and submission | Change | Store only, but started so the submission goes in before build 8's 90 days end. Listing words say "Terminal" and "Catch Me Up". The age rating weighed against terminal peers, 4+ to 17+. Expect the 2026 "Information Needed" request: a recording from launch on a physical iPhone on the latest iOS. The seller decision is taken here. Fewer repeated Apple product names (5.2.5). iPhone Duo screenshots from April 2027 |
| 12 | 333.10, the badge | Keep | With 333.9, unchanged |

Nothing in 333 is dropped. Items 5 and 6 inside 333.1 are.

## 9. His steps

Now, at no cost:

1. Create the support@tortie.sh mailbox so mail is delivered, and send it one test message. `dig MX tortie.sh`
   returned no mail record at 23:12 UTC on 6 October.
2. On the Agreements page, check that the License Agreement revision of 18 August 2026 is accepted.
3. Request Ita Vero's D-U-N-S number, if that is not done yet (his answer 1 of 30 September).
4. Answer the four questions in section 13, or let the defaults stand.
5. Install the iOS 27 Simulator runtime before 333.4, or its rows stay unmeasured (his ruling 9).

Build 7, when 337.1 has landed and the main session leaves the archive in the Organizer:

6. Press Distribute App, choose "App Store Connect" (Apple's documentation calls it "TestFlight & App Store"),
   then Distribute. Never choose "TestFlight Internal Only". If Xcode offers to change the build number, stop:
   that number already exists.
7. Answer export compliance as before, and add the build to the internal group as before.

Before build 8 is submitted:

8. Give the go-ahead for 333.5 in his site repository, and approve the deploy of the three pages.
9. Record two clips and put them online as unlisted links. Clip 1, filmed with a camera: the Mac shows its
   code, the phone scans it, and Allow is pressed on the Mac. Clip 2, a screen recording on his iPhone from
   launch: the Terminal, a key typed, a numbered answer, Catch Me Up, and End. If his iPhone runs iOS 27 by
   then, both clips also serve the store.
10. Upload build 8 the same way as step 6, and check it end to end on his phone.

The submission:

11. In TestFlight, Test Information: the Beta App Description and What to Test from section 10, the feedback
    email support@tortie.sh, the marketing URL https://tortie.sh and the privacy URL https://tortie.sh/privacy.
    Beta App Review Information: his name, a phone number with + and the country code, an email, sign-in not
    required, and the notes from section 10.3 with the two clip links and the devices-tested line.
12. Check the internal group still exists. Create an external group named "Public". Switch off in-app
    screenshot feedback for it, and leave testing on Apple silicon Macs and Vision Pro off.
13. Add build 8 to "Public". That submits it to Beta App Review. Note the date: the three working days start
    here.
14. If the submission returns `BETA_CONTRACT_MISSING`, report it to Apple, and let the timebox run.

While Apple reviews:

15. The main session tags the Mac release; the lane builds a draft. Install the draft's DMG, pair his phone
    against it, and run research 27 §3.7's checks.
16. Reply to App Review if they write. If build 8 is rejected under 2.1, submit build 9 with See a sample.

Launch day, on approval or after three working days, whichever is first:

17. Create the public link: open to anyone, with no tester limit.
18. Merge the site change that points tortie.sh/iphone at the link (or leave the holding page if the timebox
    ran out), promote the Mac draft, merge the README, and start the site's changelog refresh by hand.

After launch:

19. Upload a newly approved build to "Public" at least every 75 days, and log each build's expiry date.
20. Start the store lane, so the store submission goes in before build 8's 90 days end.

## 10. The drafts the Terminal changes

These replace research 136 §12.1, §12.2 and §12.3, and add to §12.5 and §12.6. They say "terminal" (question 3)
and never "remote desktop", "mirror", "stream" or "SSH". Words in square brackets are added only when the named
entry has landed. The labels "See a sample" and "Leave sample" are drafts until 333.3 fixes them in
`Copy.swift`. "0.111" is the release that carries Settings then Phone; if the tag is another number, the words
change with it. Apple states no length limit for the Beta App Description or What to Test that this round
found, so both are kept short.

### 10.1 Beta App Description (public on the link's page)

> Tortie for iPhone works with Tortie for Mac, the free, open-source app at tortie.sh that keeps your
> coding-agent sessions and shells running on your Mac. Tap a session to open its terminal: read it, scroll
> back, and type into it, with keys for Esc, Tab, the arrows, Control and Return. See which sessions are waiting
> on you, answer a numbered question with a tap, catch up on what a session said, and end a session after Face
> ID, Touch ID or your passcode. You pair it once by scanning a code in Tortie on your Mac, and then it talks
> only to that Mac. You need an Apple silicon Mac running Tortie for Mac 0.111 or later, awake with Tortie open,
> and Tailscale signed in on that Mac. [333.3: Before you pair, open See a sample to look around.]

No reviewer instruction goes here, because this text is public (Tactic's page, section 4).

### 10.2 What to Test (build 8)

> Update Tortie for Mac to 0.111 or later. Then, in Tortie on your Mac, open Settings then Phone, switch on Let
> my phone reach this Mac, press Pair and scan the code. The first code can take several minutes. Open a
> session's terminal and type into it, answer a numbered question if one is waiting, open Catch Me Up, and end
> a session you do not need. Tell us anything that reads wrong or does not work, and which version of Tortie for
> Mac you run.

### 10.3 Review notes (Beta App Review, and later App Review)

About 2,800 characters as drafted, and about 3,000 once the links, the devices line and the contact are filled,
against Apple's limit of 4,000. Without the build 9 bracket it is about 2,300.

> WHAT THIS APP IS. Tortie for iPhone is the companion to Tortie for Mac, a free, open-source (Apache-2.0)
> desktop app at https://tortie.sh. Both are one open-source project by its author, <seller name>, who is the
> seller of this app; the source of both is public at https://github.com/gregce/tortie. Tortie belongs to Ita
> Vero, LLC, his company. Tortie for Mac keeps a developer's terminal sessions, coding agents and plain shells,
> running on their own Mac through quits, crashes and restarts. The iPhone app is for that developer away from
> the Mac. It lists their sessions with the ones waiting on them first. Tapping one opens its terminal, to read,
> scroll back and type into. It answers a numbered question with one tap, shows what the session said (Catch Me
> Up), and ends a session after Face ID, Touch ID or the passcode.
>
> HOW TO REVIEW IT. The app needs the developer's own Mac. Two videos show it working on a physical iPhone: a
> camera video of pairing, with the code scanned and Allow pressed on the Mac, at <link 1>, and a screen
> recording of use from launch, at <link 2>. [333.3: Without a Mac, tap See a sample on the first screen.
> Made-up sessions load from a file inside the app; every screen says Sample, and nothing leaves the phone. Tap a
> session; it opens on its terminal. Pinch, turn the phone sideways, tap to type: keys appear on the sample's
> prompt and nothing runs. Tap an option under the waiting session, the Catch Me Up icon, and End, which shows
> the Face ID or passcode check and ends only the sample's copy. Tap Leave sample to return.]
>
> CODE EXECUTION (2.5.2). Nothing is downloaded or run on the phone. The terminal is text the Mac sends. Keys
> go to that session on the person's own Mac, and every command runs there.
>
> HOW IT CONNECTS. No account and no sign-in in this app, and no server of ours. The person scans a code Tortie
> for Mac shows and allows the phone on the Mac. The phone then talks only to that Mac, over the internet
> through Tailscale Funnel, which the person runs on their own Mac under their own Tailscale account, with TLS
> 1.3 from phone to Mac. The app uses Apple's frameworks only and no third-party code. We collect nothing.
>
> OUTSIDE SERVICES. Tailscale Funnel, on the person's Mac. Tortie uses no AI service itself; sessions may run
> coding agents the person installed, which talk to their makers under those makers' terms.
>
> DEVICES AND VERSIONS TESTED. <from 333.4's first pass>.
>
> PERMISSIONS. Camera: only to read the pairing code. Face ID or Touch ID: only before ending a session.
> Notifications: asked only when the paired Mac can send alerts; the app works fully without them.
>
> REGIONS. The same in every region. A developer tool, not a regulated field.
>
> CONTACT. <seller name>, support@tortie.sh, <phone>.

Every technical claim above was checked against the tree: the Terminal keeps nothing
(`ios/Tortie/Screens/Screen.swift:24-31`), TLS 1.3 is the minimum (`ios/Tortie/Door/DoorClient.swift:557`), the
Funnel argument list (`src/main/pocket/funnel.ts:591`), the permissions (`ios/Tortie/Info.plist:25-28`), and
pairing needs Allow (`Copy.swift:264`). The Ita Vero sentence must stay true and checkable. `LICENSE:189` names
Ita Vero, but tortie.sh names it only in its changelog data, so research 136 §10's written licence from Ita
Vero to him is still owed under path A; if it does not exist when he submits, drop that sentence.

The reply plans, written now and sent only if needed:

- A 4.3 rejection: who makes Tortie and where its source and history are public, what only Tortie does (sessions
  that survive quit, crash and reboot; any agent or a plain shell; no account; no server of ours; open source),
  a screen recording, and a request for a call.
- A 4.2.7 rejection: the app is a terminal client for the person's own Mac, like the approved terminal clients;
  the same recording; a request for a call. Never a build with the Terminal removed to pass and restored later.

### 10.4 Additions to the privacy and support pages (136 §12.5 and §12.6)

Privacy page, replacing the first paragraph:

> Tortie for iPhone and Tortie for Mac are made by Ita Vero, LLC. We do not collect your data. We have no
> accounts, no analytics and no advertising, and no data passes through a server we run. While Tortie for
> iPhone is tested through Apple's TestFlight, and later on the App Store, Apple sends us crash reports, and
> any feedback or screenshot a tester chooses to send, under Apple's terms.

Privacy page, added after "What leaves your iPhone":

> Your terminal. When you open a session's terminal, your Mac sends your phone what that terminal shows and
> what it printed before. Every key you type there goes to your Mac and into that session, as if you typed it
> at your Mac. If the session runs a coding agent, that agent may send what you type to the company that makes
> it, under that company's terms. Your phone keeps none of it: no file, no log and no picture.
>
> Your Mac's name. While your Mac lets your phone reach it, its Tailscale name can be looked up by anyone on the
> internet. That name often holds your first name. You can rename your Mac in Tailscale.
>
> Cutting off a phone. Press Remove beside it in Settings then Phone on your Mac, or switch off Let my phone
> reach this Mac.

Support page, added:

> Tortie for iPhone needs Tortie for Mac 0.111 or later on an Apple silicon Mac. Tortie for Mac updates when you
> quit it.
>
> After Tortie for Mac updates, it may ask you once to allow your phone again. If your phone says Tortie could
> not reach your Mac, open Settings then Phone on your Mac and press Allow.
>
> If you are not the admin of your Tailscale network, the admin may need to allow Funnel for your Mac.
>
> Alerts on your phone are not offered yet.

### 10.5 The store description, for 333.9 later

It gains "open a session's terminal, scroll back through what it printed and type into it", loses "The
terminal's scrollback stays on your Mac." (136 §12.4), and writes "computer" and "this app" where it can, to
avoid the repeated Apple product names that cost Cmux Remote a 5.2.5 rejection.

## 11. What was refuted

| Claim before the attack | What killed or changed it | Where it went |
| --- | --- | --- |
| CC Pocket shows that an in-app sample is what got no-account companions approved | It was approved on 6 March 2026 and its sample shipped on 1 October (`ccpocket/CHANGELOG.md:14-19`, lookup 6759188790). Its notes and a video passed for seven months | Refuted. At most three such companions remain, first-approval route unknown. The sample is insurance |
| Control Plane was rejected "for having no sample" | PR 52: build 14's notes "pointed at a hosted review server that returned 503" | Refuted. A broken host, not a missing sample |
| The link came after the store release for Orca, Happier and Pairlet | A first Wayback capture dates a crawl, not when a link was made | Refuted as evidence of order |
| The 90-day expiry collides with his pause | The pause stops before 333.1 (`docs/BACKLOG.md:41174`), so there are no public testers to strand | Refuted for this pause; the general rule on gaps stays (section 7.4) |
| A rejected build holds the 1.0.0 slot until it is resolved | Apple: "You can only have one build of each version in review at a time." A rejected build is not in review | Weakened. The slot is held only while waiting or in review |
| Apple's 2026 "Information Needed - New App Submission" request comes at the beta | All five public cases found are App Store submissions | Weakened. Moved to 333.9 |
| 4.2.7 is "low to moderate" | The two apps using 4.2.7's word "mirror" tell Apple they stay local or private; only four companions publish review records | Weakened. Unknown, with no cure |
| Hosted review infrastructure is what failed | Superset passed with a hosted demo account; what failed was hosting that broke | Weakened. Tortie's own reasons still rule out a hosted door (section 4) |
| Coupling the Mac release costs about a day | That is a mean over Runway's customers, not a bound | Weakened. Hence the three-day timebox |
| 510 feed downloads show an audience for a staged rollout | Each running Mac reads the feed about every 6 hours: roughly ten Macs | Weakened. No staged rollout |
| Ship a build without the Terminal as a last resort | Superset's runbook and Apple's "attempting to hide features in review" | Weakened. Removing a feature to pass and restoring it later is the flagged pattern |
| One line in `build/p316/CHECKLIST.md` fixes the upload | The fact holds, but that checklist is stale in three other places | Weakened. The fix goes in build 7's hand-off note and the new p333 checklist |
| The sample screen's vendor marks are a 5.2.1 risk | Cmux Remote's approved demo names Claude Code; Tactic's beta was named "Claude Remote" | Weakened. Replace the screen because it looks broken and shows a test path |
| On launch day every public Mac sends QR v:3 | Most strangers' Macs stay on 0.110.0 until Tortie quits | Weakened. The phone must name the Mac version |
| Research 136's 4.2.7 rating, "no raw terminal, ever", "2 to 10 days", "90% in 24 hours", "no crash reporting", and routes changing "only by adding" | His 337 and 337.1 rulings; Apple's pages of 6 October; the door's confirmed route field | Superseded (section 2.1) |

Held under attack: every Apple quote in section 3 was re-read against a saved copy; the Internal Only rule; the
review-time sentence; `BETA_CONTRACT_MISSING` with no Apple reply; the 404s; 337.1 removing all three cushions;
the stale CHANGELOG clauses; the route field turning phones off; the door's required keys; rule (z)'s collision
with a SwiftUI `Link`; and Paseo's compatibility rules.

## 12. What is not settled

- Whether Beta App Review or App Review treats a terminal-first app, reached over the public internet through
  Funnel, as a 4.2.7 remote desktop app. No record either way, and no cure if it fires. If build 8 is rejected
  under 4.2.7 or 4.3 and the reply plan fails, the phone plan needs his ruling.
- Whether his team is hit by `BETA_CONTRACT_MISSING`. It shows only at the first external submission.
- Whether a video alone clears 2.1 at Beta App Review for Tortie. CC Pocket's evidence is from the store, for a
  chat-first app.
- Whether Apple counts the Mac as "required hardware". The route sends both a filmed clip and a screen
  recording.
- Whether a sample mode in an app with no login needs Apple's "prior approval" under 2.1(a). Apple's help page
  on demo modes does not mention it, and the approved precedents record none.
- Whether the door runs inside a signed, notarized Tortie. The release-candidate check is the first time.
- A stranger's first Funnel approval page (host and clicks), the App Store version of Tailscale with Funnel, and
  a Tailscale user who is not an admin. None has been driven.
- The Terminal on iOS 27, on an iPad with a hardware keyboard, and with VoiceOver, until 333.4.
- Whether a public link ever expires.
- Whether the TestFlight form blocks submission without a privacy URL. The route makes it moot.
- The length limits of the Beta App Description and What to Test. Only the notes' 4,000 characters is stated.
- Whether builds 3 to 6 went up as Internal Only. Only App Store Connect shows it, and it does not matter once
  build 7 goes up the right way.
- Whether Texas SB 2420 and the other age-assurance laws reach TestFlight installs. Apple's news names App Store
  downloads only.
- Whether guideline 5.1.1(ix), apps that "require sensitive user information should be submitted by a legal
  entity", would be read against a terminal app from an individual account. No record found.
- Whether his Developer ID certificate came from the authority that expires on 1 February 2027.
- What 333.12's per-route agreement looks like, and whether it keeps refusal 8. It needs its own research lane.
- Runway's times are means over its own customers, not Apple figures.

## 13. Questions for him

1. If Apple has not approved the public build three working days after it is submitted, should the Mac release
   go out anyway, with tortie.sh/iphone saying the iPhone app is in Apple's review? Your 21 September reason was
   "a changelog describing a door with nothing behind it". Your request now is not to block on Apple.
   Options: wait for approval however long it takes; promote on approval or after three working days with a
   holding page; release the Mac now, before submitting, with a holding page.
   Recommended: promote on approval, or after three working days, whichever is first.
2. Your answer "In-app sample, plus your video" stands. The Terminal has made the sample about twice the work.
   Should the first public build go to Apple with your video and notes before See a sample is built, with the
   sample following in the next build? CC Pocket passed review for seven months on notes and a video.
   Options: submit before the sample; wait until the sample is built.
   Recommended: submit before the sample, and the sample follows in build 9.
3. Your 337.1 ruling names it Terminal in the app, while the store text "still says the session's screen".
   Should the beta, review and store texts also say "terminal"? They would still never say "remote desktop",
   "mirror", "stream" or "SSH". Apple asks that metadata reflect the app's core experience, and treats hiding a
   feature as a warning sign.
   Options: say "terminal"; keep "the session's screen".
   Recommended: say "terminal".
4. 318.1's message box adds a read and a write to the door. Today any added route turns off every paired phone
   until its owner presses Allow on their Mac. Should 318.1 land before the public launch (the first public
   build then waits for it), or after 333.12, the fix that keeps already-allowed routes working?
   Options: before the launch; after 333.12.
   Recommended: after 333.12.

## 14. Evidence

Every page below was read on 6 October 2026, from 22:18 UTC. tortie.sh's three pages and its mail record were
read again by the writer at 23:12 UTC.

### 14.1 Apple

| Page | URL |
| --- | --- |
| App Review Guidelines, "Last Updated: June 8, 2026" (2.1(a), 2.2, 2.3, 2.3.1(a), 2.5.2, 4.2.7, 4.3, 5.1.1, 5.1.2(i), 5.2.5) | https://developer.apple.com/app-store/review/guidelines/ |
| The same page, captured 30 September and 5 October | https://web.archive.org/web/20260930205741id_/https://developer.apple.com/app-store/review/guidelines/ and https://web.archive.org/web/20261005005947id_/https://developer.apple.com/app-store/review/guidelines/ |
| App Review (the review time; support and privacy links; demo video) | https://developer.apple.com/distribute/app-review/ |
| The same page, captured 3 October | https://web.archive.org/web/20261003000051id_/https://developer.apple.com/distribute/app-review/ |
| App Review Help, review status (hiding features) | https://developer.apple.com/help/app-review/after-submitting-for-review/review-status |
| App Review Help, a complete review (devices tested, outside services, video) | https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review |
| App Review Help, compatible devices | https://developer.apple.com/help/app-review/before-submitting-for-review/test-compatible-devices |
| Developer Program License Agreement (6.5, 7.4; revision of 18 August 2026) | https://developer.apple.com/support/terms/apple-developer-program-license-agreement/ |
| Invite external testers | https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/ |
| Add internal testers | https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/ |
| Provide test information | https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/ |
| TestFlight overview | https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/ |
| View tester feedback (screenshot feedback off per group) | https://developer.apple.com/help/app-store-connect/test-a-beta-version/view-tester-feedback/ |
| Stop testing a build | https://developer.apple.com/help/app-store-connect/test-a-beta-version/stop-testing-a-build/ |
| Testing on Apple silicon Macs and on Vision Pro | https://developer.apple.com/help/app-store-connect/test-a-beta-version/test-iphone-and-ipad-apps-on-macs-with-apple-silicon and https://developer.apple.com/help/app-store-connect/test-a-beta-version/test-iphone-and-ipad-apps-on-apple-vision-pro/ |
| TestFlight, and TestFlight for testers | https://developer.apple.com/testflight/ and https://developer.apple.com/testflight/testers/ |
| Beta App Review detail attributes (notes up to 4,000 characters) | https://developer.apple.com/documentation/appstoreconnectapi/betaappreviewdetail/attributes-data.dictionary |
| Beta group attributes | https://developer.apple.com/documentation/appstoreconnectapi/betagroup/attributes-data.dictionary |
| Distributing your app for beta testing and releases (the "TestFlight & App Store" option) | https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases |
| Acquiring crash reports | https://developer.apple.com/documentation/xcode/acquiring-crash-reports-and-diagnostic-logs |
| Export compliance: overview, beta builds, regulations, the Info.plist key | https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/ , https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-export-compliance-information-for-beta-builds/ , https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations , https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption |
| Developer news (iPhone Duo on 23 October; iOS 27 submissions; the Developer ID Sub-CA on 1 February 2027) | https://developer.apple.com/news/ |
| Prepare for iPhone Duo | https://developer.apple.com/iphone-duo/prepare/ |
| App Store Connect release notes (Xcode 27.1 RC uploads) | https://developer.apple.com/help/app-store-connect/release-notes/ |
| Upcoming requirements | https://developer.apple.com/news/upcoming-requirements/ |
| Age ratings values and definitions | https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/ |
| Developer system status | https://www.apple.com/support/systemstatus/data/developer/system_status_en_US.js |
| Forums: `BETA_CONTRACT_MISSING` | https://developer.apple.com/forums/thread/848325 , /848226 , /848666 , /849154 , /849738 |
| Forums: Beta App Review waits; beta approved while the store rejected | https://developer.apple.com/forums/thread/819916 , /798759 , /848256 |
| Forum: a closed link's message | https://developer.apple.com/forums/thread/109263 |
| Live and closed public link pages | https://testflight.apple.com/join/NLskzwi5 (GitHub), /YjeGMQBA (Orca, "This beta is full."), /DvR54qeU (Tactic, closed), /qqTPmvCd , /x27e26xs , /B5XkzqQs , /kJhmX5vV (404), /MnuClabg (Termius), /1AlPbnLZ (Home Assistant), /SqNPfdxq (Swiftfin) |

### 14.2 Third parties

| Source | What it shows |
| --- | --- |
| https://www.runway.team/appreviewtimes (updated 6 October 2026) | TestFlight waiting 13h 57m, in beta review 1h 23m; App Store waiting 7h 13m, in review 2h 4m; two-week means over Runway's customers |
| https://itunes.apple.com/lookup with ids 6759188790 (CC Pocket), 6769380881 (Cmux Remote), 6788926383 (Superset), 6783338052 (cmux, empty), 6766130217 (Orca), 6787819824 (T3 Code), 6758008464 (Tactic Remote), 6788670826 (CmuxPhone), 6771283805 (Telecmux), 6790581233 (Nodeterm), 549039908 (Termius), 6757859949 (Moshi), 6759467788 (Claudette Echo), 6748571505 (Happy) | Release dates, sellers, ratings and store text |
| https://web.archive.org/cdx/search/cdx?url=testflight.apple.com/join/<code> | First captures of public links |
| https://github.com/manaflow-ai/cmux/pull/11289 , /pull/12921 , /pull/17029 , /pull/12395 , /issues/6700 , /issues/7433 | cmux's review history and its external beta |
| https://github.com/lucive-apps/control-plane/pull/52 and /pull/41 | The 503 rejection and the local demo; the TestFlight card |
| https://github.com/K9i-0/ccpocket commits `9508db60` and `dfad8078` (public API) | CC Pocket's review notes before its sample |
| https://github.com/erwins-enkel/shepherd/issues/2828 | A peer planning to mention its terminal only as a side feature |
| https://github.com/sharneng/spliit2go/issues/184 , https://github.com/m96-chan/iOSSH/issues/48 | The 2026 new-account request, at App Store submissions |
| https://api.github.com/repos/gregce/tortie and /releases | 88 stars; v0.110.0's asset download counts |
| `dig MX tortie.sh` through 1.1.1.1 | No mail record (22:47 and 23:12 UTC) |
| https://tortie.sh/iphone , /privacy , /support | 404 (22:20, 22:47 and 23:12 UTC) |
| https://tailscale.com/kb/1223/funnel | Funnel on macOS needs one of the open-source variants |

### 14.3 The clones

Shallow clones under the scratchpad's `r140/repos/`, read only: blink `a90b442`, ccpocket `8354ffd`, cmux
`bb4a834b`, cmux-remote `1590e65`, control-plane `698156c0`, paseo `2d85fe4` (and r139's `2f0cb2f`), happier
`f51c34c0`, happy `3d809c7`, home-assistant iOS `a20ea04`, immich `86fed46`, Swiftfin `677388e`, Termix Mobile
`2455d64`, nextcloud ios `3ebda4f`, nodeterm `4398acc`, orca `c893048a`, superset `91eb343`, t3code `f4f148eb`,
Telecmux `6bd0327`, vibetunnel `f78324f`. The lines cited: `superset-sh_superset/apps/mobile/store.config.js:20,
23, 34`, `RELEASE.md:48-51, 175-177, 213-214`; `ccpocket/CHANGELOG.md:14-19`, `docs/demo-mode.md:27-30`;
`cmux-remote/docs/launch-assets/asc-metadata.md:307-335`, `release-notes/1.0.9.md:3-13`;
`cmux/ios/AppStoreReview/reviewer-setup.md:77-81`; `orca/src/renderer/src/components/mobile/mobile-platform-copy.ts:4-21`,
`orca/mobile/fastlane/Fastfile:266-269`; `t3code/docs/user/install.md:107`,
`t3code/.github/workflows/mobile-eas-production.yml:9-18`; `getpaseo_paseo/docs/protocol-compatibility.md:3, 16,
35-37`, `docs/release.md:192, 313`.

### 14.4 The tree and the site

The Tortie tree at `e3837139`: `CHANGELOG.md:12, 13, 16, 18, 19`; `README.md:160, 173`; `package.json:4`;
`electron-builder.yml:1`; `.github/workflows/release.yml:176-179, 229-230`;
`src/renderer/settings/PhoneSection.tsx:69, 72, 74, 80, 88, 212-223`; `src/main/updates/updater.ts:79, 125-127,
421-422`; `src/main/pocket/pairing.ts:342, 445, 1161`; `src/main/pocket/ipc.ts:1149, 1291-1305`;
`src/main/capabilities.ts:455`; `src/main/pocket/bind.ts:13`; `src/main/pocket/funnel.ts:129, 591, 596-617`;
`src/main/alerts/key-file.ts:103`; `src/shared/push-copy.ts:27`; `src/shared/ipc/pocket.ts:98, 809-832, 1054-1056,
1124-1125`; `ios/Tortie.xcodeproj/project.pbxproj:417, 427, 428, 437, 449`; `ios/Tortie/Info.plist:25-28`;
`ios/Tortie/Style/Copy.swift:254, 264, 266-270, 293, 513, 668`; `ios/Tortie/Door/Contract.swift:12-17`;
`ios/Tortie/Door/Pairing.swift:63, 105-109`; `ios/Tortie/Door/DoorClient.swift:557`;
`ios/Tortie/Screens/DoorWords.swift:67-140, 377-379`; `ios/Tortie/Screens/Screen.swift:24-31`;
`ios/Tortie/Screens/SessionsScreen.swift:430`; `ios/Tortie/Screens/SettingsScreen.swift:86-87, 312-314`;
`ios/Tortie/Screens/ScreenKeyField.swift`; `ios/Tortie/App/OwnerCheck.swift:111-113`;
`build/conformance-ios.mjs:280-290, 2985`; `build/fixtures/screen/sample-claude-2.1.287.json`;
`build/p316/CHECKLIST.md:94-95`; `build/p3165/CHECKLIST.md:58`; `build/p3166/CHECKLIST.md:42`;
`build/p330/CHECKLIST.md:40-46, 90`; `build/p337/CHECKLIST.md`; `build/p337/SPEC.md:1449-1450`;
`docs/BACKLOG.md:40992, 41008, 41076, 41128, 41130, 41174, 41212, 41226, 41262`; research 27 §3.7, research 132 §3.1,
§3.3 and §3.8, research 136 (lines 85, 242, 271, 327, 353-361, 535, 640, 729, §10, §12, §14), research 139 §6.

The Phase 337.1 spec, in flight, read only: `/private/tmp/wt-p3371/build/p3371/SPEC.md:34-44` (rulings 1 to 5),
D1, D16, D21, D22, D34, D35, and §11.

His site repository, read only: `/Users/gdc/tortiedotsh/src/data/docs.ts:259`, `src/data/site-links.ts:1-2`,
`vercel.json`.
