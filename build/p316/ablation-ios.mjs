#!/usr/bin/env node
/**
 * `npm run ablation:p316` — the attack on `conformance:ios` (Phases 316.2,
 * 316.3, 330 and 316.5, build/p316/SPEC.md §4 S2 and S3, build/p330/SPEC.md
 * §6.4, build/p3165/SPEC.md §6.4).
 *
 * A GREEN GATE IS ONLY EVIDENCE IF IT CAN GO RED. `conformance:ios` reads the
 * phone app as text for twenty-seven refusals, (a) to (z) with (m) and (q)
 * folded into (l) by Phase 330, and every one of them is a line a later round can add
 * in a hurry: a colour typed straight into a screen, a sentence in a `Text`, a
 * network call outside the door client, a DEBUG seam that leaked into Release,
 * an ATS exception, a background mode, a VPN entitlement, a web view, the
 * person's words run through markdown, a screenshot, a vector edited by hand,
 * a sum on a number the door sends that traps (k1 and k2 are the two the
 * reverify of 2026-09-23 ended the app with, put back exactly as they
 * shipped). Phase 316.4 added the first TestFlight build's: the brand master
 * shipped as the icon with its alpha channel, the icon laid on another ground
 * or given a transparent colour, a second picture or a dark appearance in the
 * icon set, a build naming no icon, asset symbols compiled into the app, his
 * team in Debug or on a second target, another team, Release signed by hand
 * or as a distribution identity, a profile named, the bundle id or the build
 * number moved in Release alone, the Home Screen name changed, and the team
 * set by an xcconfig.
 *
 * PHASE 330 TOOK THE PHONE OFF THE TAILNET, and its arms are the ways the
 * tailnet could come back or the ordinary client could stop being one: (l)
 * TailscaleKit, the Tailnet folder, a node, a background task, a framework or
 * a build phase that builds; (c) a second network file, URLSession in the
 * client, an NWConnection in a screen; (e) the ATS dictionary, a ts.net
 * exception, the local network string; (n) the client key's Secure Enclave
 * flag, its accessibility, its permanence and its deletion on every ending
 * that is not paired; (p) the one-shot secret kept, logged, aliased or read
 * twice; (t) the pinned mutual TLS 1.3 client — no identity, a verify block
 * that always passes, TLS 1.2, a wider port set, any host, Transfer-Encoding,
 * two lengths and a hostile arm dropped; (u) DEBUG in Release by any of four
 * doors; and (v) a failure or a step with no sentence.
 *
 * PHASE 316.5 GAVE THE PHONE ITS ALERT (build/p3165/SPEC.md §6.4), and its arms
 * are the ways the alert could reach further than it may: (d) the alert
 * address seam out of #if DEBUG; (w) a second entitlement, `production`
 * written into the file, a `remote-notification` string, and the topic the Mac
 * signs for moved off the app; (x) the registration with Apple in every build
 * or twice, a badge written, the token printed, a payload read in a screen, a
 * DEBUG build presenting as production, and, from research 136 §9 (alerts are
 * the push key holder's alone), iOS asked before the Mac said it can send, a
 * pairing that asks whatever the Mac said, and a launch check that asks iOS
 * for a Mac that cannot send.
 *
 * PHASE 316.6 GAVE THE PHONE TABS, SETTINGS WITH UNPAIR, AND MARKDOWN
 * (build/p3166/SPEC.md §6), and its thirty arms are the ways those could reach
 * further than they may: (a) the tab bar's look set outside Tokens.swift, the
 * badge in the dot's amber; (b) a literal tab, a fourth tab, the bar hidden on
 * a pushed session, the tab stored; (k) a door number in the renderer's scope,
 * an unnamed operator in Settings; (n) a Keychain item deleted from a screen,
 * the keys deleted before the record, Unpair swallowing the store's error; (s)
 * the build left at 3; (x) the unregister in every build, before the record
 * went, or in a test; (y) the parser importing SwiftUI, a cap read twice, a
 * force unwrap, a regular expression, an unbounded recursion, a second parse,
 * a localized key, a plain Text, a door type; (z) an image fetched, an in-app
 * browser, a second way out, the Open press not asking again, Settings opening
 * another address, the port clause gone. ITS RULED ROUND (2026-10-01) adds
 * seven to (y): an ordered item drawn with a counted number, the marker's
 * digits read back from an Int, a mark drawn from the item's place; the page
 * cap loosened, the cells not counted, a link kept in an answer drawn as
 * written, and that answer drawn in another face than the build before it
 * drew. HIS RULING OF 2026-10-02 ("Ship tabs + Settings, markdown off") pins
 * the page cap at 0, so every answer is drawn as written: one arm more puts
 * the ruled round's 26 back (y2b), and the loosening arm (y13) adds 26 at the
 * cap's one site rather than multiplying a 0.
 *
 * PHASE 317 GAVE THE PHONE END, BEHIND FACE ID (build/p317/SPEC.md §6.3), and
 * its arms are the ways a write could go out twice, unsigned, unconfirmed or
 * after the app left: (ab) a POST from a screen, signedPost from a third
 * caller, two ids in one write, an 8-byte id, unsorted keys, a fourth key, a
 * second call of the writer, a retry, handed set in the completion or after
 * another statement or with withheld never asked, a cancel that withholds
 * handed bytes, a result not classified by handed, an echo taken from anybody
 * and an empty echo taken with any outcome; (ac) LocalAuthentication in a
 * screen, the biometrics-only policy evaluated or asked outside kind(), the
 * hardware's mark drawn unasked (the fix round, the verify's E3), a reuse
 * window, a kept context, an owner
 * check that always says yes, a run outside .confirmed, the check named in
 * Settings, a stored Face ID switch and the purpose string reworded, with (e)'s
 * device spelling of it, and (the tests round) the End press's `.disabled`
 * taken out or turned round; (ad) the targets made a var or grown, a second await
 * per turn, the stop read after the first write or set back to false, a stop
 * that cancels nothing, a runner never registered or registered after the
 * check, wentAway stopping nothing or cancelling no task, and the targets
 * persisted (the fix round took Unpair's Mac half, and its arm, out); (t) a write with no identity and a hostile
 * write arm dropped or expecting a sentence the door never says; (v) End's line
 * optional, a result with no sentence, an empty line; (k) an operator in End
 * these; (s) the build left at 4.
 *
 * PHASE 316.7 GAVE THE SESSIONS TAB SHOW, GROUP BY, SORT BY AND TWO FILTERS
 * (build/p3167/SPEC.md §8.4), composed by main, and its eighteen (aa) arms are
 * the ways the phone could start deciding the list, keep more than three words
 * or lose End these: a `.sorted` on the tab, UserDefaults outside its one
 * store, a fourth key, a string the door answered stored, a TextField, the
 * target's parameters swapped and a value written bare, the UserDefaults reason
 * CA92.2, the menu's `.disabled(` taken out, a project header taking taps by
 * `.onTapGesture` rather than as a Button and a header's Button made a
 * container (the fix round, 2026-10-03, when the header first built and then
 * the fix's first try each read enabled to XCUITest while selecting),
 * `.olderMac` set without awaiting
 * the list, load()'s `batchHeld` check taken out, Done no longer clearing the
 * hold, nothing setting it from End these' phase, the stored read's `.cancel()`
 * taken out, a second `.endBatch(` on SessionsScreen, and the Sessions tab
 * building a ListScreen of its own.
 *
 * PHASE 337 GAVE THE PHONE THE SCREEN (build/p337/SPEC.md §6.4), and its
 * forty-seven arms are the ways a session's own screen could size the Mac,
 * type a key twice or late, take a paste, leave a picture of itself, or draw
 * a shape someone transcribed: (ah) a width asked for in three places; (ai)
 * two writes in flight, a 50 ms pace, a 65th item, a named key batched, the
 * lock read off a clock, the app leaving with a sender running, a 36th name
 * and the C1 controls let through; (aj) autocorrection, smart dashes, a drop,
 * Paste and Go, a composition sent while marked and a block of lines run line
 * by line; (ak) a line fresh past the door's own keep-alive, reused however
 * long it sat, never closed by the phone, a stray answer kept, Connection:
 * close ignored, a read retried after any failure and every exchange kept;
 * (al) the pasteboard read back or named in another file, and (p) the Copy
 * write moved out of its one file; (am) a second colour constructor and a
 * public ScreenColor init; (a) the page token gone; (an) upside down, a
 * landscape opened elsewhere and one left on behind the Screen, and (e) a
 * device spelling of the orientation list; (ao) the cover drawn only in the
 * background or carrying words; (ap) a box character transcribed, a glyph
 * scaled up and the shapes no longer read from their names; (ab) a keys body
 * built outside signedPost or missing its dialog; (ac) End back at the bottom
 * and its bar's identifier back; (v) the Screen's sentences optional or
 * empty; (t) a hostile Screen arm dropped or counting no POST; (k) a keys
 * write's bytes summed with a trapping `+`. `s8` and `s11` moved to build 7.
 *
 * PHASE 318 GAVE THE PHONE A REPLY WITH NO FACE ID (build/p318/SPEC.md §6.3),
 * and its twenty-seven arms are the ways a press or a message could go out
 * twice, rewritten, behind a check his ruling refused, or after the app left:
 * (ab) a press body built in a screen, a sixth key, a message posted twice;
 * (ae) the writer's say or choose called outside the runner, his words
 * trimmed, smart dashes left on, Send not off while a write runs, the command
 * or an option cut short; (af) Face ID asked by a press, LocalAuthentication
 * in the strip, the owner check in the choice press; (ag) a runner registered
 * after its task starts, wentAway stopping no reply, a message persisted, a
 * send while one runs, the kept window past the Mac's ledger, a say kept on
 * any refusal, a say handed an id that is no kept say's, a press that sends
 * an id, the kept words held as a String; (t) a hostile reply arm dropped or
 * letting a press POST twice; (v) a reply's sentence optional, a result with
 * none, the message line emptied. Three Phase 317 arms moved with the shapes
 * 318 changed: `ab3` (the id is `minted` now), and `s8` and `s11` (build 6,
 * and 5 is the one App Store Connect has seen). THIS SCRIPT PLANTS EACH ONE IN A CLONE OF THE SHIPPING
 * TREE AND PROVES IT REDDENS THE RULE THAT OWNS IT.
 *
 * PHASE 337.1 OPENED A SESSION ON ITS TERMINAL, SCROLLED IT BACK AND RENAMED
 * THE CONVERSATION CATCH ME UP (build/p3371/SPEC.md §6.4), and its arms are the
 * ways the rebuilt view could move under him or the pages reach further than
 * they may: (aq) a SwiftUI scroll view or GeometryReader back, the inset
 * adjustment on, the single tap not waiting, the hosting view taking touches,
 * the delta applied outside layoutSubviews or set rather than added, D25's pad
 * removed, a point read in the view, a fourth writer of the offset (the fix
 * round's four SwiftUI arms left with the view they planted into); (ar) the
 * first draft's opt-out on the representable alone, an inset written outside
 * keyboardOverlap, the line not padded by the overlap, the frame not
 * converted, the overlap never published, a second opt-out; (as) cols in the
 * target, the overlap or space check removed, two pages in flight, a 0.1 s
 * pace, a point by its layout row, Copy over unfetched rows, 5,000 rows held, a
 * key that stays scrolled back, a picture that raises no depth, top moved
 * outside reserve, the history persisted, its model outside the Screen*
 * family; (at) Route.screen back, End before the icon, the tray on new
 * identifiers, the Terminal with no door, the face decided twice, the icon a
 * word, the container renamed; (au) Conversation back, Catch Me Up re-cased,
 * a conversation identifier; and the widened (ak) side line, (ah) page width,
 * (ai) second minGap, (x) keyboard userInfo, (v) page sentence and (t) arm.
 *
 * PHASE 333.1, A STRANGER'S FIRST RUN (build/p3331/SPEC.md §6.3), gave the
 * phone three numbered steps, Scan code, the three pages of Tortie's own site
 * and the Tortie marker, and its arms are the ways those could reach further
 * than they may: (av) a fourth page, an address over http, with a query, a
 * fragment, a look-alike host or forced with `!`, a second `https://` literal
 * in a screen, the opener taking a String or skipping LinkPolicy, a second
 * opener, a third file naming SiteOpener, QRScanner built outside the Scan
 * code branch, scanning set true or startScanning() called anywhere but Scan
 * code, the camera asked for by the model, "beta" in a Copy word, the Allow line under
 * a time-out or asked by the list, the marker's guard taken out, a version
 * arm written as one number, and (the fix round, av9) the Privacy and
 * Support actions swapped on either screen or a row identified as the other;
 * (s) the build left at 7, 337.1's; (v) `unsupportedCode` back with no
 * sentence; (b) a step's number handed to stepRow as a literal (b12, the fix
 * round). `s8` and `s11` moved to build 8.
 *
 * THE DELTA RULE. The base is run first. An arm passes only when its own rule
 * was GREEN at the base and is RED with the plant, so a rule that was already
 * red proves nothing and says so. An arm whose anchor is gone from the tree
 * FAILS BY NAME — it never skips — because an ablation that quietly stops
 * applying is how a gate's proof rots.
 *
 * IT NEVER WRITES INTO THE WORKING TREE. Several builders work in one worktree
 * during a phase, so the plants go into a CLONE: `cp -Rc` (APFS clonefile) of
 * `ios/`, `src/`, the brand master rule (r) reads, and every entry of
 * `build/` but `vendor/` under
 * `/private/tmp/p316-ablation-<pid>`, with `package.json` and the tsconfigs
 * copied and `node_modules` and `build/vendor` symlinked (whatever is vendored
 * is never copied, and an arm whose file resolves under `build/vendor/` fails
 * by name rather than write through the link), and
 * the clone's OWN `build/conformance-ios.mjs` run there, so rule (j) checks the
 * clone's own vectors against the clone's own sources. Each planted file is put
 * back (a planted NEW file is removed with any folder it made, a removed one
 * written back) and its
 * sha256 checked against the working tree's before the next arm; the clone is
 * removed in a `finally` and on SIGINT, SIGTERM and SIGHUP; and the run ends by
 * asserting the working tree's own bytes never moved.
 *
 * It starts nothing but `conformance:ios` (one plain node, and the pinned tsx
 * for rule (j)). No Xcode, no Simulator, no Electron, no socket, nothing under
 * the person's home.
 *
 *   node build/p316/ablation-ios.mjs
 *   P316_ONLY=a1,h node build/p316/ablation-ios.mjs     named arms only
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32 } from 'node:zlib';
import { decodePng } from '../png-read.mjs';
import { ICON_MASTER, ICON_PATH, encodeRgbPng, flatten, groundOf } from './app-icon.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p316-ablation]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------------------
// The arms. Each names its rule, the file it plants into (relative to the
// clone), and an edit that must CHANGE that file or the arm fails by name.
// ---------------------------------------------------------------------------

/** Phase 316.7's two files (build/p3167/SPEC.md §6.4.4, §6.4.5). */
const SESSIONS_SCREEN = 'ios/Tortie/Screens/SessionsScreen.swift';
const SESSIONS_CHOICES = 'ios/Tortie/Screens/SessionsChoices.swift';

/** A line written after the LAST line matching `re`, at that line's indent. */
function afterLastLine(re, line) {
  return (src) => {
    const lines = src.split('\n');
    let k = -1;
    lines.forEach((l, i) => {
      if (re.test(l)) k = i;
    });
    if (k === -1) return src;
    lines.splice(k + 1, 0, line(/^[ \t]*/.exec(lines[k])[0]));
    return lines.join('\n');
  };
}

/** The end of the bracket opened at `open` in `src`, or -1. */
function closeOf(src, open) {
  const pair = { '(': ')', '{': '}' };
  let depth = 0;
  for (let k = open; k < src.length; k += 1) {
    if (src[k] === src[open]) depth += 1;
    else if (src[k] === pair[src[open]]) {
      depth -= 1;
      if (depth === 0) return k;
    }
  }
  return -1;
}

/**
 * The modifier `.name(…)` taken out of the chain that holds the first line
 * matching `at`: the lines from the chain's first term (the line above its
 * leading-dot lines) to its last leading-dot line.
 */
function dropFromChain(at, name) {
  return (src) => {
    const lines = src.split('\n');
    const k = lines.findIndex((l) => at.test(l));
    if (k === -1) return src;
    let lo = k;
    while (lo > 0 && /^\s*\./.test(lines[lo])) lo -= 1;
    let hi = k;
    while (hi + 1 < lines.length && /^\s*\./.test(lines[hi + 1])) hi += 1;
    const from = lines.slice(0, lo).join('\n').length + (lo > 0 ? 1 : 0);
    const to = lines.slice(0, hi + 1).join('\n').length;
    const chain = src.slice(from, to);
    const m = new RegExp(`\\.\\s*${name}\\s*\\(`).exec(chain);
    if (m === null) return src;
    const close = closeOf(chain, m.index + m[0].length - 1);
    if (close === -1) return src;
    const cut = `${chain.slice(0, m.index)}${chain.slice(close + 1)}`.replace(/\n[ \t]*(?=\n)/, '');
    return `${src.slice(0, from)}${cut}${src.slice(to)}`;
  };
}

/** The list property SessionsModel holds (`let list: ListModel`), by its declaration. */
const listNameOf = (src) => /\b(?:let|var)\s+([A-Za-z_]\w*)\s*:\s*ListModel\b/.exec(src)?.[1] ?? null;

/** `state = .olderMac` left where it is, and the await of the list's read before it taken out. */
function olderMacUnawaited(src) {
  const set = /\bstate\s*=\s*\.olderMac\b/.exec(src);
  const list = listNameOf(src);
  if (set === null || list === null) return src;
  let last = null;
  for (const m of src.slice(0, set.index).matchAll(new RegExp(`\\bawait\\s+(?:self\\.)?${list}\\.load\\(\\)`, 'g'))) last = m;
  if (last === null) return src;
  return `${src.slice(0, last.index)}_ = ${list}${src.slice(last.index + last[0].length)}`;
}

/** The first `if batchHeld { … }` or `guard !batchHeld else { … }` in SessionsModel, taken out whole. */
function dropHold(src) {
  const load = /\bclass\s+SessionsModel\b/.exec(src);
  if (load === null) return src;
  const hold = /\n[ \t]*(?:if\s+(?:self\.)?batchHeld\b[^{\n]*|guard\s+!\s*(?:self\.)?batchHeld\b[^{\n]*else\s*)\{/.exec(src.slice(load.index));
  if (hold === null) return src;
  const start = load.index + hold.index;
  const close = closeOf(src, start + hold[0].length - 1);
  return close === -1 ? src : `${src.slice(0, start)}${src.slice(close + 1)}`;
}

/** Every `?.cancel()` of the model's stored Task taken out. */
function dropCancel(src) {
  const name = /\bvar\s+([A-Za-z_]\w*)\s*:\s*Task\s*</.exec(src)?.[1] ?? null;
  if (name === null) return src;
  return src.replace(new RegExp(`\\n[ \\t]*(?:self\\.)?${name}\\s*\\??\\.cancel\\(\\)[ \\t]*(?=\\n)`, 'g'), '');
}

const APP = 'ios/Tortie';
/** The first app Swift file under a screens directory, found rather than named. */
const aScreen = (root) => {
  const dir = join(root, APP, 'Screens');
  const names = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.swift')).sort() : [];
  return names.length === 0 ? null : `${APP}/Screens/${names[0]}`;
};
const aTest = (root) => {
  for (const d of ['ios/TortieUITests', 'ios/TortieTests']) {
    const dir = join(root, d);
    const names = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.swift')).sort() : [];
    if (names.length > 0) return `${d}/${names[0]}`;
  }
  return null;
};
/** The first app Swift file whose text matches `re`. */
const fileMatching = (root, re) => {
  const out = [];
  const walk = (dir) => {
    for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.swift')) out.push(p);
    }
  };
  walk(join(root, APP));
  const hit = out.sort().find((p) => re.test(readFileSync(p, 'utf8')));
  return hit === undefined ? null : relative(root, hit).split(sep).join('/');
};
const append = (text) => (src) => `${src}${src.endsWith('\n') ? '' : '\n'}${text}`;
/**
 * Several replacements in order, each `[from, to]`, every one of which must
 * match (an arm whose anchor is gone leaves the text unmoved and FAILS by
 * name): the way two actions are swapped through a placeholder.
 */
const allOf = (...pairs) => (src) => {
  let out = src;
  for (const [from, to] of pairs) {
    if (!out.includes(from)) return src;
    out = out.replace(from, to);
  }
  return out;
};
const PAIRING_SCREEN = `${APP}/Screens/PairingScreen.swift`;
const LINKS = `${APP}/Markdown/Links.swift`;

const PBX = 'ios/Tortie.xcodeproj/project.pbxproj';
const INFO = `${APP}/Info.plist`;
const ICON = ICON_PATH;
const ICON_SET_CONTENTS = `${APP}/Assets.xcassets/AppIcon.appiconset/Contents.json`;

/** The app's own privacy manifest, found rather than named. */
const appManifest = (root) => {
  const out = [];
  const walk = (dir) => {
    for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'PrivacyInfo.xcprivacy') out.push(p);
    }
  };
  walk(join(root, APP));
  return out.length === 0 ? null : relative(root, out.sort()[0]).split(sep).join('/');
};

/** A Background Modes or NetworkExtensions capability, as the project file records one. */
const capability = (id) => (src) =>
  src.replace(
    /(CreatedOnToolsVersion = [^;]+;)/,
    `$1\n\t\t\t\t\t\tSystemCapabilities = {\n\t\t\t\t\t\t\t${id} = {\n\t\t\t\t\t\t\t\tenabled = 1;\n\t\t\t\t\t\t\t};\n\t\t\t\t\t\t};`
  );

/** A string shaped like a real Tailscale key, built from parts so no file of this tree holds one. */
const REAL_SHAPED = ['tskey-auth-kQ7Rz', 'CN', 'TRL-', 'Zx8Yw7Vu6Ts5Rq4P'].join('');

/** Remove the `#if DEBUG` line opening the first region whose body matches `re`, and its `#endif`. */
function unguard(re) {
  return (src) => {
    const lines = src.split('\n');
    for (let k = 0; k < lines.length; k += 1) {
      if (lines[k].trim() !== '#if DEBUG') continue;
      let depth = 0;
      let end = -1;
      for (let j = k; j < lines.length; j += 1) {
        const t = lines[j].trim();
        if (/^#if\b/.test(t)) depth += 1;
        else if (/^#endif\b/.test(t)) {
          depth -= 1;
          if (depth === 0) {
            end = j;
            break;
          }
        }
      }
      if (end === -1) continue;
      if (!re.test(lines.slice(k + 1, end).join('\n'))) continue;
      const kept = lines.filter((_, i) => i !== k && i !== end);
      return kept.join('\n');
    }
    return src;
  };
}

const ARMS = [
  {
    id: 'a1',
    rule: 'a',
    what: 'one hex digit of a token changed in Tokens.swift',
    file: () => `${APP}/Style/Tokens.swift`,
    edit: (src) => src.replace(/0x([0-9a-fA-F]{5})([0-9a-fA-F])/, (_, head, last) => `0x${head}${last.toLowerCase() === 'f' ? '0' : 'f'}`)
  },
  {
    id: 'a2',
    rule: 'a',
    what: 'a colour typed straight into a screen',
    file: aScreen,
    edit: append('let p316AblationColour = Color(red: 1, green: 0, blue: 0)\n')
  },
  {
    id: 'a3',
    rule: 'a',
    what: 'a named system colour in a modifier',
    file: aScreen,
    edit: append('func p316AblationTint(_ v: some View) -> some View { v.foregroundStyle(.white) }\n')
  },
  {
    id: 'b1',
    rule: 'b',
    what: 'a string literal drawn through Text in a screen',
    file: aScreen,
    edit: append('let p316AblationText = Text("Everything is fine")\n')
  },
  {
    id: 'b2',
    rule: 'b',
    what: 'a sentence written outside Copy.swift, away from any Text',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: append('let p316AblationWhy = "Your Mac said no to this."\n')
  },
  {
    id: 'c1',
    rule: 'c',
    what: 'a URLSession outside the door client',
    file: aScreen,
    edit: append('let p316AblationSession = URLSession.shared\n')
  },
  {
    id: 'c2',
    rule: 'c',
    what: 'an http:// literal written in the door client',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: append('let p316AblationScheme = "http://door"\n')
  },
  {
    id: 'd1',
    rule: 'd',
    what: 'the direct loopback transport taken out of #if DEBUG',
    file: () => `${APP}/Door/Transport.swift`,
    edit: unguard(/\b(struct|class|enum|actor)\s+\w*(Loopback|Debug|Direct)\w*/)
  },
  {
    id: 'd2',
    rule: 'd',
    what: 'the pairing payload injection taken out of #if DEBUG',
    // Door/Pairing.swift's own seam, named since Phase 316.5: App/DebugLaunch.swift
    // reads launch arguments inside #if DEBUG too, and sorts first.
    file: (root) => fileMatching(root, /#if DEBUG[\s\S]*?\benum\s+PairingDebugSeam\b[\s\S]*?#endif/),
    edit: unguard(/\benum\s+PairingDebugSeam\b/)
  },
  {
    id: 'd3',
    rule: 'd',
    what: 'the door endpoint seam\'s argument written outside #if DEBUG',
    file: aScreen,
    edit: append('let p316AblationSeam = "-TortieDebugDoorEndpoint"\n')
  },
  {
    id: 'd4',
    rule: 'd',
    what: 'the door endpoint seam taking any host, not 127.0.0.1 alone',
    file: () => `${APP}/Door/Transport.swift`,
    edit: (src) => src.replace('parts[0] == loopbackHost,', '!parts[0].isEmpty,')
  },
  {
    id: 'd5',
    rule: 'd',
    what: 'the still seam gone, its argument renamed',
    file: () => `${APP}/Screens/Pieces.swift`,
    edit: (src) => src.split('"-TortieDebugStill"').join('"-P316AblationStill"')
  },
  {
    // Phase 330, after his ruling of 2026-09-29: the store's software-key seam,
    // which lets a test run the software path on a Simulator that has an
    // enclave, is a DEBUG build's alone. Out of #if DEBUG, a Release build
    // would carry a field that keeps a client key out of the Secure Enclave.
    id: 'd6',
    rule: 'd',
    what: 'the client key store’s software-key seam taken out of #if DEBUG',
    file: () => `${APP}/Door/Keys.swift`,
    edit: unguard(/\bvar\s+softwareKeyDebugSeam\b/)
  },
  {
    id: 'e1',
    rule: 'e',
    what: 'the ATS dictionary brought back with arbitrary loads',
    file: () => `${APP}/Info.plist`,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>NSAppTransportSecurity</key>\n\t<dict>\n\t\t<key>NSAllowsArbitraryLoads</key>\n\t\t<true/>\n\t</dict>')
  },
  {
    id: 'e2',
    rule: 'e',
    what: 'a background mode added',
    file: () => `${APP}/Info.plist`,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>UIBackgroundModes</key>\n\t<array>\n\t\t<string>fetch</string>\n\t</array>')
  },
  {
    id: 'e3',
    rule: 'e',
    what: 'an ATS exception for ts.net brought back, the URLSession route research 132 left',
    file: () => `${APP}/Info.plist`,
    edit: (src) =>
      src.replace(
        /(<plist[^>]*>\s*<dict>)/,
        '$1\n\t<key>NSAppTransportSecurity</key>\n\t<dict>\n\t\t<key>NSExceptionDomains</key>\n\t\t<dict>\n\t\t\t<key>ts.net</key>\n\t\t\t<dict>\n\t\t\t\t<key>NSIncludesSubdomains</key>\n\t\t\t\t<true/>\n\t\t\t</dict>\n\t\t</dict>\n\t</dict>'
      )
  },
  {
    id: 'e4',
    rule: 'e',
    what: 'a background mode injected by a build setting the plist does not show',
    file: () => 'ios/Tortie.xcodeproj/project.pbxproj',
    edit: (src) => src.replace(/(\n(\s*)INFOPLIST_FILE = )/, '\n$2INFOPLIST_KEY_UIBackgroundModes = fetch;$1')
  },
  {
    id: 'f1',
    rule: 'f',
    what: 'import NetworkExtension',
    file: aScreen,
    edit: (src) => `import NetworkExtension\n${src}`
  },
  {
    id: 'f2',
    rule: 'f',
    what: 'a networking entitlement',
    file: () => `${APP}/Tortie.entitlements`,
    edit: (src) => {
      const entry = '\t<key>com.apple.developer.networking.networkextension</key>\n\t<array>\n\t\t<string>packet-tunnel-provider</string>\n\t</array>\n';
      return src.includes('<dict/>') ? src.replace('<dict/>', `<dict>\n${entry}</dict>`) : src.replace('<dict>', `<dict>\n${entry}`);
    }
  },
  {
    id: 'g',
    rule: 'g',
    what: 'a web view that could run what the door sends',
    file: aScreen,
    edit: append('import WebKit\nlet p316AblationWeb = WKWebView()\n')
  },
  {
    id: 'h',
    rule: 'h',
    what: 'the ask drawn as markdown',
    file: (root) => fileMatching(root, /Text\s*\(\s*verbatim\s*:[^)\n]*askText/),
    edit: (src) => src.replace(/Text\s*\(\s*verbatim\s*:\s*([^)\n]*askText)\s*\)/, 'Text(try! AttributedString(markdown: $1))')
  },
  {
    id: 'i1',
    rule: 'i',
    what: 'screenshots switched back on in the test plan',
    file: () => 'ios/Tortie.xctestplan',
    edit: (src) => src.replace(/("uiTestingScreenshotsEnabled"\s*:\s*)false/, '$1true')
  },
  {
    id: 'i2',
    rule: 'i',
    what: 'a test that takes a screenshot',
    file: aTest,
    edit: append('import XCTest\nfunc p316Ablation(_ app: XCUIApplication) { _ = app.screenshot() }\n')
  },
  {
    id: 'j',
    rule: 'j',
    what: 'a vector edited by hand',
    file: () => 'ios/TortieTests/Fixtures/vectors.json',
    edit: (src) => src.replace(/"([0-9a-f])([0-9a-f]{31,})"/, (_, first, rest) => `"${first === '0' ? '1' : '0'}${rest}"`)
  },
  {
    id: 'k1',
    rule: 'k',
    what: "the list's shipped trap put back: `others.count + max(0, answer.othersOmitted)`",
    file: () => `${APP}/Screens/ListScreen.swift`,
    edit: (src) =>
      src.replace(
        /guard let otherCount = DoorNumber\.sum\(others\.count, answer\.othersOmitted\) else \{\s*throw DoorFailure\.malformed\s*\}/,
        'let otherCount = others.count + max(0, answer.othersOmitted)'
      )
  },
  {
    id: 'k2',
    rule: 'k',
    what: "the session's shipped trap put back: `counts.user + replies`, a sum that names no door field",
    file: () => `${APP}/Screens/ActivityCells.swift`,
    edit: (src) => src.replace(/let total = try together\(counts\.user, replies\)/, 'let total = counts.user + replies')
  },
  {
    id: 'k3',
    rule: 'k',
    what: 'the paging sum taken bare: `heldLast.index + 1`',
    file: () => `${APP}/Door/Contract.swift`,
    edit: (src) => src.replace(/DoorNumber\.sum\(heldLast\.index, 1\)/, 'Optional(heldLast.index + 1)')
  },
  {
    id: 'k4',
    rule: 'k',
    what: 'a door number decoded with no bound',
    file: () => `${APP}/Door/Contract.swift`,
    edit: (src) => src.replace(/othersOmitted = try c\.doorNumber\(forKey: \.othersOmitted\)/, 'othersOmitted = try c.decode(Int.self, forKey: .othersOmitted)')
  },
  {
    id: 'k5',
    rule: 'k',
    what: 'the one checked helper adding bare',
    file: () => `${APP}/Door/Contract.swift`,
    edit: (src) => src.replace(/\ba\.addingReportingOverflow\(b\)/, '(a + b, false)')
  },
  // PHASE 330, the phone off the tailnet (build/p330/SPEC.md §6.4). (c) the
  // one network file.
  {
    id: 'c3',
    rule: 'c',
    what: 'a screen opening an NWConnection itself, past the pin and the identity',
    file: aScreen,
    edit: append('func p316AblationSend(_ e: NWEndpoint) { let c = NWConnection(to: e, using: .tls); c.start(queue: .main) }\n')
  },
  {
    id: 'c4',
    rule: 'c',
    what: 'a second network file beside the door client',
    file: () => `${APP}/Door/Relay.swift`,
    create: true,
    edit: () => 'import Network\n\nlet p316AblationConnection: NWConnection? = nil\n'
  },
  {
    id: 'c5',
    rule: 'c',
    what: 'URLSession brought back into the door client',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: append('let p316AblationSession = URLSession(configuration: .ephemeral)\n')
  },
  {
    id: 'e5',
    rule: 'e',
    what: 'the Background Modes capability turned on in the project',
    file: () => PBX,
    edit: capability('com.apple.BackgroundModes')
  },
  {
    id: 'e6',
    rule: 'e',
    what: 'the local network usage string brought back',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>NSLocalNetworkUsageDescription</key>\n\t<string>Tortie reaches your Mac directly.</string>')
  },
  {
    id: 'e7',
    rule: 'e',
    what: 'the export-compliance answer written by an agent',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>')
  },
  {
    id: 'f3',
    rule: 'f',
    what: 'import NetworkExtension in the door client',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => `import NetworkExtension\n${src}`
  },
  {
    id: 'f4',
    rule: 'f',
    what: 'the NetworkExtensions capability turned on in the project',
    file: () => PBX,
    edit: capability('com.apple.NetworkExtensions.iOS')
  },
  // (l) no Tailscale in the phone (316.3's (l), (m) and (q) in one).
  {
    id: 'l1',
    rule: 'l',
    what: 'TailscaleKit imported by a screen',
    file: aScreen,
    edit: (src) => `import TailscaleKit\n${src}`
  },
  {
    id: 'l2',
    rule: 'l',
    what: 'a module re-exported, so every file has its names',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace(/^import Foundation$/m, '@_exported import Foundation')
  },
  {
    id: 'l3',
    rule: 'l',
    what: 'the Tailnet folder back, with a node in it',
    file: () => `${APP}/Tailnet/Node.swift`,
    create: true,
    edit: () => 'import Foundation\n\nenum P316AblationNode {}\n'
  },
  {
    id: 'l4',
    rule: 'l',
    what: 'TailscaleNode named in a screen',
    file: aScreen,
    edit: append('var p316AblationNode: TailscaleNode? = nil\n')
  },
  {
    id: 'l5',
    rule: 'l',
    what: 'a background task keeping the app awake',
    file: aScreen,
    edit: append('func p316AblationKeepAwake() { _ = UIApplication.shared.beginBackgroundTask { } }\n')
  },
  {
    id: 'l6',
    rule: 'l',
    what: 'TailscaleKit.xcframework referenced by the project again',
    file: () => PBX,
    edit: (src) => src.replace(/(\/\* Begin PBXFileReference section \*\/\n)/, '$1\t\t316C00000000000000000001 /* TailscaleKit.xcframework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.xcframework; name = TailscaleKit.xcframework; path = ../build/vendor/tailscalekit/TailscaleKit.xcframework; sourceTree = SOURCE_ROOT; };\n')
  },
  {
    id: 'l7',
    rule: 'l',
    what: 'a test importing TailscaleKit, so it could start a node of its own',
    file: aTest,
    edit: (src) => `import TailscaleKit\n${src}`
  },
  {
    id: 'l8',
    rule: 'l',
    what: 'a build phase that builds something',
    file: () => PBX,
    edit: (src) => src.replace(/(\/\* Begin XCBuildConfiguration section \*\/)/, '/* Begin PBXShellScriptBuildPhase section */\n\t\t316A0000000000000000F002 /* P316 */ = {\n\t\t\tisa = PBXShellScriptBuildPhase;\n\t\t\tshellScript = "make -C ../build/vendor/tailscalekit ios-fat\\n";\n\t\t};\n/* End PBXShellScriptBuildPhase section */\n\n$1')
  },
  {
    id: 'l9',
    rule: 'l',
    what: 'a libtailscale symbol called from the app',
    file: aScreen,
    edit: append('let p316AblationHandle = tailscale_new()\n')
  },
  {
    id: 'l10',
    rule: 'l',
    what: 'performExpiringActivity stretching the app past the background',
    file: aScreen,
    edit: append('func p316AblationStretch() { ProcessInfo.processInfo.performExpiringActivity(withReason: "p316") { _ in } }\n')
  },
  {
    id: 'l11',
    rule: 'l',
    what: 'a background URLSession in the door client',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: append('let p316AblationBackground = URLSessionConfiguration.background(withIdentifier: "p316")\n')
  },
  {
    id: 'l12',
    rule: 'l',
    what: 'significant-change location monitoring, which relaunches the app',
    file: () => `${APP}/Door/P316AblationWake.swift`,
    create: true,
    edit: () => 'import CoreLocation\n\nenum P316AblationWake {\n    static let manager = CLLocationManager()\n    static func arm() { manager.startMonitoringSignificantLocationChanges() }\n}\n'
  },
  {
    id: 'l13',
    rule: 'l',
    what: 'TailscaleKit imported in backticks by a test',
    file: aTest,
    edit: (src) => `@testable import \`TailscaleKit\`\n${src}`
  },
  // (n) the Keychain, and the client key.
  {
    id: 'n1',
    rule: 'n',
    what: 'the pairing kept with an accessibility that can leave the phone',
    file: () => `${APP}/Door/Keys.swift`,
    edit: (src) => src.split('kSecAttrAccessibleWhenUnlockedThisDeviceOnly').join('kSecAttrAccessibleWhenUnlocked')
  },
  {
    id: 'n2',
    rule: 'n',
    what: 'the pairing synchronised to his other devices',
    file: () => `${APP}/Door/Keys.swift`,
    edit: (src) => src.replace(/(kSecAttrSynchronizable as String:\s*)kCFBooleanFalse/, '$1kCFBooleanTrue')
  },
  {
    id: 'n3',
    rule: 'n',
    what: 'a second Keychain writer that never says ThisDeviceOnly',
    file: aScreen,
    edit: append('func p316AblationStash(_ d: Data) { _ = SecItemAdd([kSecClass as String: kSecClassGenericPassword, kSecValueData as String: d] as CFDictionary, nil) }\n')
  },
  {
    id: 'n4',
    rule: 'n',
    what: 'the client key made in the Secure Enclave without .privateKeyUsage',
    file: () => `${APP}/Door/Keys.swift`,
    edit: (src) => src.replace('nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, .privateKeyUsage, nil', 'nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, [], nil')
  },
  {
    id: 'n5',
    rule: 'n',
    what: 'the Secure Enclave asked for without asking whether it is there',
    file: () => `${APP}/Door/Keys.swift`,
    edit: (src) => src.replace(/\n\s*if enclave \{\n(\s*attributes\[kSecAttrTokenID as String\] = kSecAttrTokenIDSecureEnclave)\n\s*\}\n/, '\n$1\n')
  },
  {
    id: 'n6',
    rule: 'n',
    what: 'the client key made with an accessibility that can leave the phone',
    file: () => `${APP}/Door/Keys.swift`,
    edit: (src) => src.replace('nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, .privateKeyUsage', 'nil, kSecAttrAccessibleAfterFirstUnlock, .privateKeyUsage')
  },
  {
    // Re-aimed after his ruling of 2026-09-29. The fix round's n9 planted the
    // flag-less flags INSIDE the enclave's if and was red on a clause whose
    // reason was false (a software key under a flag-less access control reads
    // back `aku`; the `dk` was the enclave key's own attribute). This plants
    // the shape before the fix round as it was: one access control for BOTH
    // paths, made before the if, with the software key's own line kept, so it
    // is red on the restated clause alone.
    id: 'n9',
    rule: 'n',
    what: 'the shape before the fix round: one access control for both paths, made outside the if on SecureEnclave.isAvailable',
    file: () => `${APP}/Door/Keys.swift`,
    edit: (src) =>
      src.replace(
        '        if enclave {\n            // ThisDeviceOnly, and the Secure Enclave may only USE the key.',
        '        guard let shared = SecAccessControlCreateWithFlags(\n            nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, enclave ? .privateKeyUsage : [], nil\n        ) else { throw KeysFailure.clientKey }\n        privateAttributes[kSecAttrAccessControl as String] = shared\n        if enclave {\n            // ThisDeviceOnly, and the Secure Enclave may only USE the key.'
      )
  },
  {
    id: 'n10',
    rule: 'n',
    what: 'the software client key made with no accessibility of its own',
    file: () => `${APP}/Door/Keys.swift`,
    edit: (src) => src.replace('            privateAttributes[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly\n', '')
  },
  {
    id: 'n7',
    rule: 'n',
    what: 'a pairing attempt that ends unpaired keeping its client key',
    file: () => `${APP}/Door/Pairing.swift`,
    edit: (src) => src.replace('            store.clientKeys.delete(tag: pending.clientKey.tag)\n', '')
  },
  {
    id: 'n8',
    rule: 'n',
    what: 'a client key that is not permanent',
    file: () => `${APP}/Door/Keys.swift`,
    edit: (src) => src.replace('kSecAttrIsPermanent as String: true', 'kSecAttrIsPermanent as String: false')
  },
  // (o) the app's own manifest.
  {
    id: 'o1',
    rule: 'o',
    what: "the app's own manifest deleted",
    file: appManifest,
    remove: true
  },
  {
    id: 'o2',
    rule: 'o',
    what: "the app's manifest saying it tracks",
    file: appManifest,
    edit: (src) => src.replace(/(<key>NSPrivacyTracking<\/key>\s*)<false\/>/, '$1<true/>')
  },
  {
    id: 'o5',
    rule: 'o',
    what: "the app's manifest taken out of the app target by a membership exception",
    file: () => PBX,
    edit: (src) => src.replace(/(membershipExceptions = \()/, '$1\n\t\t\t\tPrivacyInfo.xcprivacy,')
  },
  {
    id: 'o6',
    rule: 'o',
    what: "the app calling a required-reason API its manifest does not declare",
    file: aScreen,
    edit: append('let p316AblationModes = UITextInputMode.activeInputModes\n')
  },
  // (p) no tailnet key, and the code and its one-shot secret kept nowhere.
  {
    id: 'p1',
    rule: 'p',
    what: 'the one-shot secret kept in the pairing record',
    file: () => `${APP}/Door/Keys.swift`,
    edit: (src) => src.replace(/(\n(\s*)let exchangeSeed: String\n)/, '$1$2let ps: String?\n')
  },
  {
    id: 'p2',
    rule: 'p',
    what: 'the one-shot secret logged',
    file: () => `${APP}/Door/Pairing.swift`,
    edit: append('func p316AblationLog(_ o: PairingOffer) { print(o.secret) }\n')
  },
  {
    id: 'p3',
    rule: 'p',
    what: 'the one-shot secret written to a file through an alias',
    file: () => `${APP}/Door/Pairing.swift`,
    edit: append('func p316AblationKeep(_ o: PairingOffer, _ url: URL) throws { let saved = o.secret; try saved.write(to: url) }\n')
  },
  {
    id: 'p4',
    rule: 'p',
    what: 'a tailnet key typed into the app',
    file: () => `${APP}/Door/Pairing.swift`,
    edit: append('let p316AblationKey = "tskey-auth-kP316ablation"\n')
  },
  {
    id: 'p5',
    rule: 'p',
    what: 'a string shaped like a real key in a test',
    file: aTest,
    edit: append(`// ${REAL_SHAPED}\n`)
  },
  {
    id: 'p6',
    rule: 'p',
    what: 'tk read back from the code',
    file: () => `${APP}/Door/Pairing.swift`,
    edit: (src) => src.replace('        let exp: Double\n', '        let exp: Double\n        let tk: String?\n')
  },
  {
    id: 'p7',
    rule: 'p',
    what: 'a second use of the code on a line KEY_NAMED names',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace('let offer = try PairingOffer.parse(payload)', 'let offer = try PairingOffer.parse(payload.isEmpty ? payload : payload)')
  },
  {
    id: 'p8',
    rule: 'p',
    what: "the code-as-read's mirror taken out inside the parse",
    file: () => `${APP}/Door/Pairing.swift`,
    edit: (src) => src.replace(/\n\s*var customMirror: Mirror \{ Mirror\(self, children: \[:\], displayStyle: \.struct\) \}\n(\s*\}\n)/, '\n$1')
  },
  {
    id: 'p9',
    rule: 'p',
    what: "the offer's mirror taken out, so print(offer) and dump(offer) reach the secret",
    file: () => `${APP}/Door/Pairing.swift`,
    edit: (src) => src.replace(/\n\s*var customMirror: Mirror \{ Mirror\(self, children: \["door"[^\n]*\n/, '\n')
  },
  {
    id: 'p11',
    rule: 'p',
    what: "the pairing model's mirror taken out, so dump(model) repeats the last code",
    file: () => `${APP}/Screens/PairingScreen.swift`,
    edit: (src) => src.replace(/extension PairingModel: CustomReflectable \{\n[^\n]*\n\}\n/, '')
  },
  {
    id: 'p12',
    rule: 'p',
    what: 'the raw code, which carries the key, kept in the Keychain under its own account',
    file: () => `${APP}/Screens/PairingScreen.swift`,
    edit: (src) => src.replace(/\n(\s*)spent = payload\n/, '\n$1spent = payload\n$1try? KeychainSecretStore().write(Data(payload.utf8), account: "p316-last-code")\n')
  },
  {
    id: 'p13',
    rule: 'p',
    what: 'the raw code logged',
    file: () => `${APP}/Screens/PairingScreen.swift`,
    edit: (src) => src.replace(/\n(\s*)spent = payload\n/, '\n$1spent = payload\n$1print(payload)\n')
  },
  {
    id: 'p14',
    rule: 'p',
    what: "the camera's code bound to a name the rule does not watch",
    file: () => `${APP}/Screens/PairingScreen.swift`,
    edit: (src) => src.replace(/guard let code = metadataObjects/, 'guard let scanned = metadataObjects').replace(/onCode\?\(code\)/, 'onCode?(scanned)')
  },
  {
    id: 'e8',
    rule: 'e',
    what: 'a background mode spelled for the iPhone (UIBackgroundModes~iphone)',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>UIBackgroundModes~iphone</key>\n\t<array>\n\t\t<string>fetch</string>\n\t</array>')
  },
  {
    id: 'e9',
    rule: 'e',
    what: 'a background mode spelled for iOS (UIBackgroundModes-iphoneos)',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>UIBackgroundModes-iphoneos</key>\n\t<array>\n\t\t<string>audio</string>\n\t</array>')
  },
  {
    id: 'e10',
    rule: 'e',
    what: 'a background mode spelled for the iPad (UIBackgroundModes~ipad)',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>UIBackgroundModes~ipad</key>\n\t<array>\n\t\t<string>fetch</string>\n\t</array>')
  },
  {
    id: 'e11',
    rule: 'e',
    what: 'a background mode injected by an xcconfig',
    file: () => `${APP}/P316Ablation.xcconfig`,
    create: true,
    edit: () => 'INFOPLIST_KEY_UIBackgroundModes = fetch\n'
  },
  {
    id: 'e12',
    rule: 'e',
    what: 'an iPhone spelling of the ATS dictionary beside the checked one',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>NSAppTransportSecurity~iphone</key>\n\t<dict>\n\t\t<key>NSExceptionDomains</key>\n\t\t<dict/>\n\t</dict>')
  },
  {
    id: 'f5',
    rule: 'f',
    what: 'a scoped import of one NetworkExtension enum',
    file: aScreen,
    edit: (src) => `import enum NetworkExtension.NEVPNStatus\n${src}`
  },
  {
    id: 'f6',
    rule: 'f',
    what: 'a scoped import of the hotspot manager, and a use, which links the framework',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => `import class NetworkExtension.NEHotspotConfigurationManager\n${src}\nlet p316AblationHotspot = NEHotspotConfigurationManager.shared\n`
  },
  {
    id: 'f9',
    rule: 'f',
    what: 'the framework linked by OTHER_LDFLAGS in the project',
    file: () => PBX,
    edit: (src) => src.replace(/(\n(\s*)INFOPLIST_FILE = )/, '\n$2OTHER_LDFLAGS = "-framework NetworkExtension";$1')
  },
  {
    id: 'f10',
    rule: 'f',
    what: 'the framework linked by an xcconfig',
    file: () => `${APP}/P316AblationLink.xcconfig`,
    create: true,
    edit: () => 'OTHER_LDFLAGS = -framework NetworkExtension\n'
  },
  {
    id: 'f11',
    rule: 'f',
    what: 'a NetworkExtension class looked up by its name',
    file: aScreen,
    edit: append('let p316AblationClass: AnyClass? = NSClassFromString("NEVPNManager")\n')
  },
  {
    id: 'i3',
    rule: 'i',
    what: 'code coverage turned back on in the test plan',
    file: () => 'ios/Tortie.xctestplan',
    edit: (src) => src.replace(/"codeCoverage"\s*:\s*false/, '"codeCoverage" : true')
  },
  {
    id: 'i4',
    rule: 'i',
    what: 'a build setting that instruments every build',
    file: () => PBX,
    edit: (src) => src.replace(/(\n(\s*)INFOPLIST_FILE = )/, '\n$2CLANG_COVERAGE_MAPPING = YES;$1')
  },
  {
    id: 'e13',
    rule: 'e',
    what: 'UIBackgroundModes spelled with a character reference (UIBackground&#77;odes), which CoreFoundation decodes',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>UIBackground&#77;odes</key>\n\t<array>\n\t\t<string>fetch</string>\n\t</array>')
  },
  {
    id: 'e14',
    rule: 'e',
    what: 'a second ATS dictionary spelled with references, allowing arbitrary loads',
    file: () => INFO,
    edit: (src) => src.replace(/(\n<\/dict>\n<\/plist>)/, '\n\t<key>NSAppTransport&#83;ecurity</key>\n\t<dict>\n\t\t<key>NSAllows&#65;rbitraryLoads</key>\n\t\t<true/>\n\t</dict>$1')
  },
  {
    id: 'e15',
    rule: 'e',
    what: 'UIBackgroundModes in a CDATA section',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key><![CDATA[UIBackgroundModes]]></key>\n\t<array>\n\t\t<string>fetch</string>\n\t</array>')
  },
  {
    id: 'e16',
    rule: 'e',
    what: 'the Release configuration built from a second plist',
    file: () => PBX,
    edit: (src) => {
      let n = 0;
      return src.replace(/INFOPLIST_FILE = Tortie\/Info\.plist;/g, (m) => (++n === 2 ? 'INFOPLIST_FILE = Tortie/Release/Info.plist;' : m));
    }
  },
  {
    id: 'e17',
    rule: 'e',
    what: 'Info.plist preprocessed, with a macro that spells UIBackgroundModes',
    file: () => PBX,
    edit: (src) => src.replace(/(\n(\s*)INFOPLIST_FILE = Tortie\/Info\.plist;)/, '\n$2INFOPLIST_PREPROCESS = YES;\n$2INFOPLIST_OTHER_PREPROCESSOR_FLAGS = "-DP316BG=UIBackgroundModes";$1')
  },
  {
    id: 'e18',
    rule: 'e',
    what: 'the app generating its Info.plist, with a background mode as a build setting',
    file: () => PBX,
    edit: (src) => src.replace(/GENERATE_INFOPLIST_FILE = NO;/, 'GENERATE_INFOPLIST_FILE = YES;\n\t\t\t\tINFOPLIST_KEY_UIBackgroundModes = fetch;')
  },
  {
    id: 'e19',
    rule: 'e',
    what: 'a build setting written into a key, which Xcode expands as it copies the file',
    file: () => INFO,
    edit: (src) => src.replace(/(<plist[^>]*>\s*<dict>)/, '$1\n\t<key>$(P316_ABLATION_KEY)</key>\n\t<true/>')
  },
  {
    id: 'e20',
    rule: 'e',
    what: 'a key written twice, which CoreFoundation reads once as its last value',
    file: () => INFO,
    edit: (src) => src.replace(/(\t<key>UIUserInterfaceStyle<\/key>\n\t<string>Dark<\/string>\n)/, '$1\t<key>UIUserInterfaceStyle</key>\n\t<string>Light</string>\n')
  },
  {
    id: 'f12',
    rule: 'f',
    what: 'NetworkExtension imported with the module in backticks',
    file: () => `${APP}/Door/Transport.swift`,
    edit: (src) => src.replace('import Foundation', 'import `NetworkExtension`\nimport Foundation')
  },
  {
    id: 'f13',
    rule: 'f',
    what: 'NEPacket, which the prefix list never named, used in the app',
    file: aScreen,
    edit: append('let p316AblationPacket: Any.Type = NEPacket.self\n')
  },
  {
    id: 'f14',
    rule: 'f',
    what: 'a remote Swift package added to the project',
    file: () => PBX,
    edit: (src) => src.replace(/(\/\* Begin XCBuildConfiguration section \*\/)/, '/* Begin XCRemoteSwiftPackageReference section */\n\t\t316A0000000000000000F001 /* XCRemoteSwiftPackageReference "p316" */ = {\n\t\t\tisa = XCRemoteSwiftPackageReference;\n\t\t\trepositoryURL = "https://example.invalid/p316";\n\t\t};\n/* End XCRemoteSwiftPackageReference section */\n\n$1')
  },
  {
    id: 'p15',
    rule: 'p',
    what: "a code read by Core Image's QR reader and bound to a name the rule does not watch",
    file: () => `${APP}/Screens/P316AblationStill.swift`,
    create: true,
    edit: () => 'import CoreImage\n\nenum P316AblationStill {\n    static func read(_ feature: CIQRCodeFeature) -> String? {\n        let raw = feature.messageString\n        return raw\n    }\n}\n'
  },
  {
    id: 'p16',
    rule: 'p',
    what: 'a code arriving by a deep link, kept in a file',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace(/(WindowGroup\s*\{)/, '$1\n            EmptyView().onOpenURL { url in try? url.absoluteString.write(to: FileManager.default.temporaryDirectory.appendingPathComponent("p316"), atomically: true, encoding: .utf8) }')
  },
  {
    id: 'p17',
    rule: 'p',
    what: 'a code read from the pasteboard under a name the rule does not watch',
    file: () => `${APP}/Screens/PairingScreen.swift`,
    edit: (src) => src.replace(/\n(\s*)spent = payload\n/, '\n$1spent = payload\n$1let p316Pasted = UIPasteboard.general.string\n$1_ = p316Pasted\n')
  },
  {
    id: 'p18',
    rule: 'p',
    what: "a code read from Vision's payloadData and bound to a name the rule does not watch",
    file: () => `${APP}/Screens/P316AblationVision.swift`,
    create: true,
    edit: () => 'import Vision\n\nenum P316AblationVision {\n    static func read(_ o: VNBarcodeObservation) -> Data? {\n        let raw = o.payloadData\n        return raw\n    }\n}\n'
  },
  {
    id: 'r1',
    rule: 'r',
    what: 'the brand master itself shipped as the icon, alpha channel and all',
    file: () => ICON,
    bytes: true,
    edit: () => readFileSync(join(REPO, ICON_MASTER))
  },
  {
    id: 'r2',
    rule: 'r',
    what: 'the icon laid on the dark base\'s --bg-canvas instead of the ground the script names',
    file: () => ICON,
    bytes: true,
    edit: () => {
      const master = decodePng(readFileSync(join(REPO, ICON_MASTER)));
      return encodeRgbPng(master.width, master.height, flatten(master, groundOf(readFileSync(join(REPO, 'src', 'renderer', 'styles', 'tokens.css'), 'utf8'), { base: 'dark', token: '--bg-canvas' })));
    }
  },
  {
    id: 'r3',
    rule: 'r',
    what: 'an opaque icon given a transparent colour (a tRNS chunk after its header)',
    file: () => ICON,
    bytes: true,
    edit: (buf) => {
      const at = 8 + 12 + buf.readUInt32BE(8);
      const body = Buffer.from([0, 245, 0, 247, 0, 250]);
      const head = Buffer.alloc(8);
      head.writeUInt32BE(body.length, 0);
      head.write('tRNS', 4, 'latin1');
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0);
      return Buffer.concat([buf.subarray(0, at), head, body, crc, buf.subarray(at)]);
    }
  },
  {
    id: 'r4',
    rule: 'r',
    what: "the script's ground moved to another token and the icon not made again",
    file: () => 'build/p316/app-icon.mjs',
    edit: (src) => src.replace("export const ICON_GROUND = Object.freeze({ base: 'light', token: '--bg-canvas' });", "export const ICON_GROUND = Object.freeze({ base: 'light', token: '--bg-surface' });")
  },
  {
    id: 'r5',
    rule: 'r',
    what: 'a dark appearance named in the icon set',
    file: () => ICON_SET_CONTENTS,
    edit: (src) => src.replace('"images" : [', '"images" : [\n    {\n      "appearances" : [ { "appearance" : "luminosity", "value" : "dark" } ],\n      "idiom" : "universal",\n      "platform" : "ios",\n      "size" : "1024x1024"\n    },')
  },
  {
    id: 'r6',
    rule: 'r',
    what: 'a second picture dropped into the icon set',
    file: () => `${APP}/Assets.xcassets/AppIcon.appiconset/AppIcon-dark.png`,
    create: true,
    edit: () => 'not an icon\n'
  },
  {
    id: 'r7',
    rule: 'r',
    what: 'the Release build naming no icon',
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000073 \/\* Release \*\/ = \{[\s\S]*?)\n\t*ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;/, '$1')
  },
  {
    id: 'r8',
    rule: 'r',
    what: 'asset symbols generated into the app',
    file: () => PBX,
    edit: (src) => src.replace('ASSETCATALOG_COMPILER_GENERATE_ASSET_SYMBOLS = NO;', 'ASSETCATALOG_COMPILER_GENERATE_ASSET_SYMBOLS = YES;')
  },
  {
    id: 's1',
    rule: 's',
    what: 'his team written into the app\'s Debug configuration',
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000072 \/\* Debug \*\/ = \{[\s\S]*?)DEVELOPMENT_TEAM = "";/, '$1DEVELOPMENT_TEAM = 4GRQMF5T5U;')
  },
  {
    id: 's2',
    rule: 's',
    what: "a second team, on the unit tests' Release configuration",
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000075 \/\* Release \*\/ = \{[\s\S]*?)DEVELOPMENT_TEAM = "";/, '$1DEVELOPMENT_TEAM = 4GRQMF5T5U;')
  },
  {
    id: 's3',
    rule: 's',
    what: 'another team in Release',
    file: () => PBX,
    edit: (src) => src.replace('DEVELOPMENT_TEAM = 4GRQMF5T5U;', 'DEVELOPMENT_TEAM = P316ABLATE;')
  },
  {
    id: 's4',
    rule: 's',
    what: 'Release signed by hand again',
    file: () => PBX,
    edit: (src) => src.replace('CODE_SIGN_STYLE = Automatic;', 'CODE_SIGN_STYLE = Manual;')
  },
  {
    id: 's5',
    rule: 's',
    what: 'a distribution identity written into Release',
    file: () => PBX,
    edit: (src) => src.replace('CODE_SIGN_IDENTITY = "Apple Development";', 'CODE_SIGN_IDENTITY = "Apple Distribution";')
  },
  {
    id: 's6',
    rule: 's',
    what: 'a provisioning profile named in Release',
    file: () => PBX,
    edit: (src) => src.replace('DEVELOPMENT_TEAM = 4GRQMF5T5U;', 'DEVELOPMENT_TEAM = 4GRQMF5T5U;\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "Tortie App Store";')
  },
  {
    id: 's7',
    rule: 's',
    what: 'the bundle id changed in Release, which the first upload makes permanent',
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000073 \/\* Release \*\/ = \{[\s\S]*?)PRODUCT_BUNDLE_IDENTIFIER = com\.itavero\.tortie\.phone;/, '$1PRODUCT_BUNDLE_IDENTIFIER = com.itavero.tortie.phone2;')
  },
  {
    id: 's8',
    rule: 's',
    what: 'Release a build ahead of Debug',
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000073 \/\* Release \*\/ = \{[\s\S]*?)CURRENT_PROJECT_VERSION = 8;/, '$1CURRENT_PROJECT_VERSION = 9;')
  },
  {
    id: 's9',
    rule: 's',
    what: 'the Home Screen name changed in Info.plist',
    file: () => INFO,
    edit: (src) => src.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)Tortie(<\/string>)/, '$1Tortie Phone$2')
  },
  {
    id: 's10',
    rule: 's',
    what: 'the team set by a new xcconfig',
    file: () => 'ios/P316AblationSigning.xcconfig',
    create: true,
    edit: () => 'DEVELOPMENT_TEAM = 4GRQMF5T5U\n'
  },
  // (t) pinned mutual TLS 1.3 to a public name.
  {
    id: 't1',
    rule: 't',
    what: 'no local identity set on any connection',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace(/\n\s*sec_protocol_options_set_local_identity\(options, presented\)\n/, '\n            _ = presented\n')
  },
  {
    id: 't2',
    rule: 't',
    what: 'a signed read opened with no identity',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('door: door.endpoint, identity: door.identity', 'door: door.endpoint, identity: nil')
  },
  {
    id: 't22',
    rule: 't',
    what: "a signed read's one retry on a new line opened with no identity",
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('        let again = try await connect(\n            method: "GET", target: target, headers: try readHeaders(target, door: door), body: nil,\n            door: door.endpoint, identity: door.identity,', '        let again = try await connect(\n            method: "GET", target: target, headers: try readHeaders(target, door: door), body: nil,\n            door: door.endpoint, identity: nil,')
  },
  {
    id: 't3',
    rule: 't',
    what: 'the verify block completing true whatever the pin said',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('complete(matched)', 'complete(true)')
  },
  {
    id: 't4',
    rule: 't',
    what: 'TLS 1.2 allowed',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('.TLSv13)', '.TLSv12)')
  },
  {
    id: 't5',
    rule: 't',
    what: 'port 443 taken as a door port',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('[8443, 10000]', '[443, 8443, 10000]')
  },
  {
    id: 't6',
    rule: 't',
    what: 'a code with any host taken',
    file: () => `${APP}/Door/Pairing.swift`,
    edit: (src) => src.replace('guard DoorEndpoint.isPublicName(wire.host),', 'guard !wire.host.isEmpty,')
  },
  {
    id: 't7',
    rule: 't',
    what: 'Transfer-Encoding taken',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace(/\n\s*if found\[DoorHTTP\.Read\.transferEncoding\] != nil \{ throw DoorFailure\.malformed \}\n/, '\n')
  },
  {
    id: 't8',
    rule: 't',
    what: 'two Content-Length headers taken',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('lengths.count == 1,', '!lengths.isEmpty,')
  },
  {
    id: 't9',
    rule: 't',
    what: "a hostile door's HTTP arm dropped",
    file: () => 'build/p316/hostile-door.mjs',
    edit: (src) => src.replace(/\n\s*'early-close': \{[^\n]*\},?\n/, '\n')
  },
  // (u) no DEBUG in Release (316.4's owed item 2).
  {
    id: 'u1',
    rule: 'u',
    what: "DEBUG added to the app's Release conditions",
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000073 \/\* Release \*\/ = \{\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = \{\n)/, '$1\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";\n')
  },
  {
    id: 'u2',
    rule: 'u',
    what: "-D DEBUG in the project's Release Swift flags",
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000071 \/\* Release \*\/ = \{\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = \{\n)/, '$1\t\t\t\tOTHER_SWIFT_FLAGS = "-D DEBUG";\n')
  },
  {
    id: 'u3',
    rule: 'u',
    what: "DEBUG=1 in the unit tests' Release preprocessor list",
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000075 \/\* Release \*\/ = \{\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = \{\n)/, '$1\t\t\t\tGCC_PREPROCESSOR_DEFINITIONS = (\n\t\t\t\t\t"DEBUG=1",\n\t\t\t\t\t"$(inherited)",\n\t\t\t\t);\n')
  },
  {
    id: 'u4',
    rule: 'u',
    what: 'an xcconfig defining DEBUG',
    file: () => 'ios/P316AblationDebug.xcconfig',
    create: true,
    edit: () => 'SWIFT_ACTIVE_COMPILATION_CONDITIONS = $(inherited) DEBUG\n'
  },
  {
    id: 'u5',
    rule: 'u',
    what: 'the scheme archiving Debug',
    file: () => 'ios/Tortie.xcodeproj/xcshareddata/xcschemes/Tortie.xcscheme',
    edit: (src) => src.replace(/(<ArchiveAction\s+buildConfiguration = ")Release"/, '$1Debug"')
  },
  // (v) the phone always draws a sentence (his no-key finding).
  {
    id: 'v1',
    rule: 'v',
    what: 'pairingSentence optional again, leaving drawn as nothing',
    file: () => `${APP}/Screens/DoorWords.swift`,
    edit: (src) =>
      src
        .replace('static func pairingSentence(for failure: PairingFailure) -> String {', 'static func pairingSentence(for failure: PairingFailure) -> String? {')
        .replace('case .couldNotSave, .notAvailable, .cancelled: return Copy.notPaired', 'case .couldNotSave, .notAvailable: return Copy.notPaired\n        case .cancelled: return nil')
  },
  {
    id: 'v2',
    rule: 'v',
    what: 'the pairing line emptied while a pairing is under way',
    file: () => `${APP}/Screens/PairingScreen.swift`,
    edit: (src) => src.replace('        line = DoorWords.stepSentence(for: .presenting)\n', '        line = ""\n')
  },
  {
    id: 'v3',
    rule: 'v',
    what: 'a pairing step with no line of its own',
    file: () => `${APP}/Screens/DoorWords.swift`,
    edit: (src) => src.replace('        case .findingName: return Copy.pairNameNotYet\n', '        default: return Copy.pairReaching\n')
  },
  {
    id: 'v4',
    rule: 'v',
    what: 'the pairing line made optional',
    file: () => `${APP}/Screens/PairingScreen.swift`,
    edit: (src) => src.replace('private(set) var line: String = Copy.notPaired', 'private(set) var line: String? = Copy.notPaired')
  },
  // Phase 316.5: the alert (build/p3165/SPEC.md §6.4), and research 136 §9 over it.
  {
    id: 'd7',
    rule: 'd',
    what: 'the alert address seam taken out of #if DEBUG',
    file: () => `${APP}/Alerts/SystemAlerts.swift`,
    edit: unguard(/\benum\s+AlertsDebugSeam\b/)
  },
  {
    id: 'w1',
    rule: 'w',
    what: 'a second entitlement, time-sensitive alerts',
    file: () => `${APP}/Tortie.entitlements`,
    edit: (src) => src.replace('<dict>', '<dict>\n\t<key>com.apple.developer.usernotifications.time-sensitive</key>\n\t<true/>')
  },
  {
    id: 'w2',
    rule: 'w',
    what: 'production written into the entitlements file',
    file: () => `${APP}/Tortie.entitlements`,
    edit: (src) => src.replace('<string>development</string>', '<string>production</string>')
  },
  {
    id: 'w3',
    rule: 'w',
    what: 'a remote-notification string, the silent push background mode',
    file: aScreen,
    edit: append('// UIBackgroundModes: remote-notification\n')
  },
  {
    id: 'w4',
    rule: 'w',
    what: 'the topic the Mac signs alerts for moved off the app',
    file: () => 'src/main/alerts/key-file.ts',
    edit: (src) => src.replace("PHONE_APP_TOPIC = 'com.itavero.tortie.phone'", "PHONE_APP_TOPIC = 'com.itavero.tortie.phone.alerts'")
  },
  {
    id: 'x1',
    rule: 'x',
    what: 'the registration with Apple taken out of the #else, into every build',
    file: () => `${APP}/Alerts/SystemAlerts.swift`,
    edit: (src) => src.replace('            UIApplication.shared.registerForRemoteNotifications()\n', '').replace('    func currentAddress() async -> PushAddress? {\n', '    func currentAddress() async -> PushAddress? {\n        UIApplication.shared.registerForRemoteNotifications()\n')
  },
  {
    id: 'x2',
    rule: 'x',
    what: 'a second registration with Apple, in the delegate',
    file: () => `${APP}/App/AppDelegate.swift`,
    edit: (src) => src.replace('        UNUserNotificationCenter.current().delegate = self\n', '        UNUserNotificationCenter.current().delegate = self\n        application.registerForRemoteNotifications()\n')
  },
  {
    id: 'x3',
    rule: 'x',
    what: 'the phone writing the badge, which is the Mac\'s',
    file: () => `${APP}/App/AppDelegate.swift`,
    edit: (src) => src.replace('        completionHandler()\n', '        UNUserNotificationCenter.current().setBadgeCount(0)\n        completionHandler()\n')
  },
  {
    id: 'x4',
    rule: 'x',
    what: 'the token printed',
    file: () => `${APP}/App/AppDelegate.swift`,
    edit: (src) => src.replace('        SystemPushAddressing.shared.registered(deviceToken)\n', '        print(deviceToken)\n        SystemPushAddressing.shared.registered(deviceToken)\n')
  },
  {
    id: 'x5',
    rule: 'x',
    what: 'a payload read in a screen',
    file: aScreen,
    edit: append('import UserNotifications\nfunc p316AblationPeek(_ n: UNNotification) -> Any? { n.request.content.userInfo["tortie"] }\n')
  },
  {
    id: 'x6',
    rule: 'x',
    what: 'a DEBUG build presenting its address as production',
    file: () => `${APP}/Alerts/Alerts.swift`,
    edit: (src) => src.replace('    static let current: PushEnvironment = .development\n', '    static let current: PushEnvironment = .production\n')
  },
  {
    id: 'x7',
    rule: 'x',
    what: 'the pairing screen asking iOS before it presents, whatever the Mac can do (research 136 §9)',
    file: () => `${APP}/Screens/PairingScreen.swift`,
    edit: (src) => src.replace('        let alerts = alerts\n', '        let alerts = alerts\n        _ = await alerts.askForPairing()\n')
  },
  {
    id: 'x8',
    rule: 'x',
    what: 'the pairing asking for alerts whatever the Mac said about sending (research 136 §9)',
    file: () => `${APP}/Door/Pairing.swift`,
    edit: (src) => src.replace('if sends, !asked {', 'if !asked {')
  },
  {
    id: 'x9',
    rule: 'x',
    what: 'the launch check asking iOS for a Mac that cannot send (research 136 §9)',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace(/\n\s*guard kept\.macSends else \{\n\s*list\.alertsLine = nil\n\s*return\n\s*\}\n/, '\n')
  },
  // Phase 316.6: the tab bar, Settings, Unpair and the rendered conversation
  // (build/p3166/SPEC.md §6). Thirty arms, each red on its own rule, the
  // ruled round's seven after y9, and markdown off's one (y2b, 2026-10-02).
  {
    id: 'a4',
    rule: 'a',
    what: 'UITabBar.appearance() named in the app file, outside Tokens.swift',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: append('func p316AblationBar() { _ = UITabBar.appearance() }\n')
  },
  {
    id: 'a5',
    rule: 'a',
    what: "the badge's ground set from Token.statusAttention, the attention dot's amber",
    file: () => `${APP}/Style/Tokens.swift`,
    edit: (src) => src.replace(/(badgeBackgroundColor\s*=\s*[^\n]*?)\bstatusAttentionBadgeBg\b/, '$1statusAttention')
  },
  {
    id: 'b3',
    rule: 'b',
    what: 'a literal tab label, Tab("Needs input", …)',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace('Tab(Copy.needsInput,', 'Tab("Needs input",')
  },
  {
    id: 'b4',
    rule: 'b',
    what: 'a fourth tab',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: append('struct P316AblationTabs: View {\n    var body: some View {\n        TabView {\n            Tab(Copy.sessions, systemImage: "magnifyingglass") { EmptyView() }\n        }\n    }\n}\n')
  },
  {
    id: 'b5',
    rule: 'b',
    what: 'the tab bar hidden on a pushed session',
    file: () => `${APP}/Screens/SessionScreen.swift`,
    edit: append('func p316AblationHide(_ v: some View) -> some View { v.toolbar(.hidden, for: .tabBar) }\n')
  },
  {
    id: 'b6',
    rule: 'b',
    what: 'the tab kept in @AppStorage',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: append('struct P316AblationKept {\n    @AppStorage("p316.tab") var tab = 0\n}\n')
  },
  {
    id: 'k6',
    rule: 'k',
    what: "a door number in arithmetic inside the renderer's scope (`turn.index + 1`)",
    file: () => `${APP}/Screens/MarkdownView.swift`,
    edit: append('func p316AblationNext(_ turn: (index: Int, at: Int)) -> Int { turn.index + 1 }\n')
  },
  {
    id: 'k7',
    rule: 'k',
    what: 'an unnamed integer operator in Settings, outside the scope',
    file: () => `${APP}/Screens/SettingsScreen.swift`,
    edit: append('func p316AblationCount(_ a: Int, _ b: Int) -> Int { a + b }\n')
  },
  {
    id: 'n11',
    rule: 'n',
    what: 'SecItemDelete in a screen',
    file: aScreen,
    edit: append('func p316AblationDelete(_ q: CFDictionary) { _ = SecItemDelete(q) }\n')
  },
  {
    id: 'n12',
    rule: 'n',
    what: 'the client keys deleted before the record, so a failed removal leaves the record without its identity',
    file: () => `${APP}/Door/Keys.swift`,
    edit: (src) =>
      src.replace(
        /(\n[ \t]*func forget\(\) throws \{\n)([ \t]*try secrets\.remove\(Self\.account\)\n[ \t]*try\? secrets\.remove\(Self\.formerAccount\)\n)([ \t]*for tag in clientKeys\.tags\(\) \{\n[ \t]*clientKeys\.delete\(tag: tag\)\n[ \t]*\}\n)/,
        '$1$3$2'
      )
  },
  {
    id: 'n13',
    rule: 'n',
    what: 'Unpair through try? store.forget(), which swallows the error',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace(/do \{\s*try store\.forget\(\)\s*\} catch \{\s*return \.kept\s*\}/, 'try? store.forget()')
  },
  {
    id: 's11',
    rule: 's',
    what: "the app's Release left at build 7, 337.1's, which App Store Connect refuses as a duplicate",
    file: () => PBX,
    edit: (src) => src.replace(/(316A00000000000000000073 \/\* Release \*\/ = \{[\s\S]*?)CURRENT_PROJECT_VERSION = 8;/, '$1CURRENT_PROJECT_VERSION = 7;')
  },
  {
    id: 'x10',
    rule: 'x',
    what: 'the unregister taken out of the #else, into every build',
    file: () => `${APP}/Alerts/SystemAlerts.swift`,
    edit: (src) => {
      const line = /\n(?![ \t]*\/\/)[^\n]*\bunregisterForRemoteNotifications\(\)[^\n]*/.exec(src);
      return line === null ? src : `${src.replace(line[0], '')}\nfunc p316AblationUnregister() { UIApplication.shared.unregisterForRemoteNotifications() }\n`;
    }
  },
  {
    id: 'x11',
    rule: 'x',
    what: 'forgetAddress() before door.unpair(), whether or not the record went',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => {
      const call = /\n(?![ \t]*\/\/)[^\n]*\bforgetAddress\(\)[^\n]*/.exec(src);
      if (call === null) return src;
      const without = src.replace(call[0], '');
      const at = without.search(/\n(?![ \t]*\/\/)[^\n]*\bdoor\.unpair\(\)/);
      return at === -1 ? src : `${without.slice(0, at)}${call[0]}${without.slice(at)}`;
    }
  },
  {
    id: 'x12',
    rule: 'x',
    what: 'a test naming the unregister',
    file: aTest,
    edit: append('func p316AblationUnregister() { UIApplication.shared.unregisterForRemoteNotifications() }\n')
  },
  {
    id: 'y1',
    rule: 'y',
    what: 'SwiftUI imported by the block parser',
    file: () => `${APP}/Markdown/Blocks.swift`,
    edit: (src) => `import SwiftUI\n${src}`
  },
  {
    id: 'y2',
    rule: 'y',
    what: 'a cap read twice',
    file: () => `${APP}/Markdown/Blocks.swift`,
    edit: append('let p316AblationCap = MarkdownCaps.blocks\n')
  },
  {
    id: 'y3',
    rule: 'y',
    what: 'a force unwrap in the block parser',
    file: () => `${APP}/Markdown/Blocks.swift`,
    edit: append('let p316AblationForced = Int("1")!\n')
  },
  {
    id: 'y4',
    rule: 'y',
    what: 'a regular expression in the block parser',
    file: () => `${APP}/Markdown/Blocks.swift`,
    edit: append('let p316AblationPattern = try? Regex("a+")\n')
  },
  {
    id: 'y5',
    rule: 'y',
    what: 'a recursive call passing depth: depth, so nesting is not bounded',
    file: () => `${APP}/Markdown/Blocks.swift`,
    // The first such call in CODE: the file's own header names the rule in a comment.
    edit: (src) => src.replace(/^(?![ \t]*\/\/)(.*?)\bdepth:\s*depth\s*\+\s*1\b/m, '$1depth: depth')
  },
  {
    id: 'y6',
    rule: 'y',
    what: 'a second markdown parse, in AnswerText.swift',
    file: () => `${APP}/Screens/AnswerText.swift`,
    edit: append('let p316AblationParse = try? AttributedString(markdown: "**x**")\n')
  },
  {
    id: 'y7',
    rule: 'y',
    what: 'Text(LocalizedStringKey(x)) in the drawing, which would read %@ as a format',
    file: () => `${APP}/Screens/MarkdownView.swift`,
    edit: append('func p316AblationKey(_ x: String) -> Text { Text(LocalizedStringKey(x)) }\n')
  },
  {
    id: 'y8',
    rule: 'y',
    what: 'Text(cell.plain), drawn neither verbatim nor as the AttributedString Inline.swift built',
    file: () => `${APP}/Screens/MarkdownView.swift`,
    edit: append('func p316AblationCell(_ cell: InlineText) -> Text { Text(cell.plain) }\n')
  },
  {
    id: 'y9',
    rule: 'y',
    what: "PocketTurn named by the renderer, the boundary (k)'s scope rests on",
    file: () => `${APP}/Markdown/Rendered.swift`,
    edit: append('typealias P316AblationTurn = PocketTurn\n')
  },
  // The ruled round of 2026-10-01: the agent's own numbers (y10 to y12) and
  // the page cost (y13 to y16), one plant per clause.
  {
    id: 'y10',
    rule: 'y',
    what: 'an ordered item drawn with a counted number, its ordinal, not the one the agent wrote',
    file: () => `${APP}/Markdown/Rendered.swift`,
    edit: (src) => src.replace('number: item.number,', 'number: String(itemN),')
  },
  {
    id: 'y11',
    rule: 'y',
    what: "the marker's digits parsed into an Int and written back, so 007 draws 7",
    file: () => `${APP}/Markdown/Blocks.swift`,
    edit: (src) => src.replace('self.number = String(decoding: bytes[lead.at..<p], as: UTF8.self)', 'self.number = String(number)')
  },
  {
    id: 'y12',
    rule: 'y',
    what: "an ordered item's mark drawn from its place in the list",
    file: () => `${APP}/Screens/MarkdownView.swift`,
    edit: (src) => src.replace('Copy.orderedMark(number)', 'Copy.orderedMark(String(item.n))')
  },
  {
    // Restated for his ruling of 2026-10-02 (markdown off): the cap is 0, so
    // the first build's fourfold loosening (`* 4`) moved nothing; this one
    // puts the ruled round's 26 back at the cap's one site, which draws every
    // answer under it as blocks again.
    id: 'y13',
    rule: 'y',
    what: "the page cap loosened at its one site by the ruled round's 26, so every answer under it is drawn as blocks again",
    file: () => `${APP}/Markdown/Rendered.swift`,
    edit: (src) => src.replace('> MarkdownCaps.pieces {', '> MarkdownCaps.pieces + 26 {')
  },
  {
    // His ruling of 2026-10-02, "Ship tabs + Settings, markdown off": y2 pins
    // MarkdownCaps.pieces at 0. Putting the ruled round's 26 back switches
    // markdown on again for every answer under it.
    id: 'y2b',
    rule: 'y',
    what: "markdown switched back on: MarkdownCaps.pieces put back to the ruled round's 26",
    file: () => `${APP}/Markdown/Caps.swift`,
    edit: (src) => src.replace(/\bstatic let pieces = 0\b/, 'static let pieces = 26')
  },
  {
    id: 'y14',
    rule: 'y',
    what: "a table's header cells not counted as pieces",
    file: () => `${APP}/Markdown/Rendered.swift`,
    edit: (src) => src.replace(/\n[ \t]*count \+= table\.header\.count\n/, '\n')
  },
  {
    id: 'y15',
    rule: 'y',
    what: 'a link kept in an answer drawn as written, so it could be pressed',
    file: () => `${APP}/Markdown/Inline.swift`,
    edit: (src) => src.replace('            drawn[range][LinkKey.self] = nil\n            drawn[range][ImageKey.self] = nil\n', '            drawn[range][ImageKey.self] = nil\n')
  },
  {
    id: 'y16',
    rule: 'y',
    what: 'an answer as written drawn in another face than the build before this one drew',
    file: () => `${APP}/Screens/MarkdownView.swift`,
    edit: (src) => src.replace('        Text(attributed)\n            .font(Face.body.font)', '        Text(attributed)\n            .font(Face.small.font)')
  },
  {
    id: 'z1',
    rule: 'z',
    what: 'AsyncImage in the drawing, which would fetch an image an answer names',
    file: () => `${APP}/Screens/MarkdownView.swift`,
    edit: append('func p316AblationImage(_ u: URL) -> some View { AsyncImage(url: u) }\n')
  },
  {
    id: 'z2',
    rule: 'z',
    what: 'SFSafariViewController, an in-app browser',
    file: () => `${APP}/Markdown/Links.swift`,
    edit: append('func p316AblationSafari(_ u: URL) -> Any { SFSafariViewController(url: u) }\n')
  },
  {
    id: 'z3',
    rule: 'z',
    what: '@Environment(\\.openURL) in Settings, a second way out',
    file: () => `${APP}/Screens/SettingsScreen.swift`,
    edit: append('struct P316AblationOpen: View {\n    @Environment(\\.openURL) private var open\n    var body: some View { EmptyView() }\n}\n')
  },
  {
    id: 'z4',
    rule: 'z',
    what: "the Open press's second ask removed",
    file: () => `${APP}/Markdown/Links.swift`,
    edit: (src) => {
      const open = src.search(/UIApplication\.shared\.open\(/);
      const ask = open === -1 ? -1 : src.lastIndexOf('LinkPolicy.opens(', open);
      return ask === -1 ? src : `${src.slice(0, ask)}p316AblationTrue(${src.slice(ask + 'LinkPolicy.opens('.length)}\nfunc p316AblationTrue(_ u: URL) -> Bool { true }\n`;
    }
  },
  {
    id: 'z5',
    rule: 'z',
    what: "Settings opening an address that is not iOS's notification settings",
    file: () => `${APP}/Screens/SettingsScreen.swift`,
    edit: append('func p316AblationOther() { UIApplication.shared.open(URL(fileURLWithPath: "/")) }\n')
  },
  {
    id: 'z6',
    rule: 'z',
    what: "LinkPolicy.opens's port clause removed",
    file: () => `${APP}/Markdown/Links.swift`,
    edit: (src) => src.replace(/\b\w+\.port\s*==\s*nil\b/, 'true')
  },
  // ---- PHASE 317 (build/p317/SPEC.md §6.3): one arm per new or widened clause.
  // (ab) the write.
  {
    id: 'ab1',
    rule: 'ab',
    what: 'a POST written outside present and signedPost',
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: append('func p317AblationPost() -> String { "POST" }\n')
  },
  {
    id: 'ab2',
    rule: 'ab',
    what: 'signedPost called by something other than end',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('    // MARK: Pairing', '    func p317Again(door: PairedDoor) async -> WriteResult {\n        await signedPost(route: .end(session: "p317", batch: false), door: door, limits: limits)\n    }\n\n    // MARK: Pairing')
  },
  {
    id: 'ab3',
    rule: 'ab',
    what: 'a second write id made in one write',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace(/(guard let minted = WriteId\.fresh\(\) else \{[^\n]*\}\n)/, '$1            let spare = WriteId.fresh()\n            _ = spare\n')
  },
  {
    id: 'ab4',
    rule: 'ab',
    what: 'a write id taken from 8 random bytes',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('static let byteCount = 16', 'static let byteCount = 8')
  },
  {
    id: 'ab5',
    rule: 'ab',
    what: 'the body encoded without sorted keys',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace(/\n[ \t]*encoder\.outputFormatting = \[\.sortedKeys\]\n/, '\n')
  },
  {
    id: 'ab6',
    rule: 'ab',
    what: 'a fourth key in the end body',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('struct EndBody: Encodable, Sendable {', 'struct EndBody: Encodable, Sendable {\n    let face: Bool')
  },
  {
    id: 'ab7',
    rule: 'ab',
    what: "a second call of the writer's end, outside EndRunner.run",
    file: () => `${APP}/Screens/EndBatch.swift`,
    edit: append('@MainActor func p317AblationEnd(_ w: any DoorWriting) async { _ = await w.end("x", batch: true) }\n')
  },
  {
    id: 'ab8',
    rule: 'ab',
    what: 'a write retried while it has no answer',
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) => src.replace('let result = await writer.end(id, batch: batch)', 'var result = WriteResult.noAnswer\n            repeat { result = await writer.end(id, batch: batch) } while result == .noAnswer')
  },
  {
    id: 'ab9',
    rule: 'ab',
    what: "handed set in the send's completion, after the bytes may have left",
    file: () => `${APP}/Door/DoorClient.swift`,
    // Phase 337's DoorLine: send() hands to the line's sendable connection,
    // and its completion reads only an error.
    edit: (src) => src.replace('        handed = true\n        connection.send(content: request, completion: .contentProcessed { [weak self] error in\n            guard let self, let error else { return }\n', '        connection.send(content: request, completion: .contentProcessed { [weak self] error in\n            guard let self else { return }\n            self.handed = true\n            guard let error else { return }\n')
  },
  {
    id: 'ab10',
    rule: 'ab',
    what: 'the bytes handed without asking withheld',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('guard !withheld, result == nil, let connection = line.sendable else { return }', 'guard result == nil, let connection = line.sendable else { return }')
  },
  {
    id: 'ab11',
    rule: 'ab',
    what: 'a cancel that withholds bytes already handed',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace(/\n[ \t]*guard !handed else \{ return \}\n/, '\n')
  },
  {
    id: 'ab12',
    rule: 'ab',
    what: 'the result no longer classified by handed',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace(/\n[ \t]*guard end\.handed else \{ return \.notSent\(error as\? DoorFailure \?\? \.notPaired\) \}\n/, '\n')
  },
  {
    id: 'ab13',
    rule: 'ab',
    what: 'an answer taken whatever id it echoes',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('answer.write == sent || answer.echoesNoId', '!answer.write.isEmpty || answer.echoesNoId')
  },
  {
    id: 'ab14',
    rule: 'ab',
    what: 'an empty echo taken with any outcome (F14)',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('write.isEmpty && outcome == .refused && reason == .malformed', 'write.isEmpty')
  },
  // (ac) the owner check.
  {
    id: 'ac1',
    rule: 'ac',
    what: 'LocalAuthentication imported outside OwnerCheck.swift',
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) => `import LocalAuthentication\n${src}`
  },
  {
    id: 'ac2',
    rule: 'ac',
    what: 'the biometrics-only policy, which shuts out Touch ID fallbacks and the passcode',
    file: () => `${APP}/App/OwnerCheck.swift`,
    edit: (src) => src.replace('context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)', 'context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason)')
  },
  {
    id: 'ac3',
    rule: 'ac',
    what: 'a reuse window, so an earlier match stands in for this press',
    file: () => `${APP}/App/OwnerCheck.swift`,
    edit: append('func p317AblationReuse(_ c: LAContext) { c.touchIDAuthenticationAllowableReuseDuration = 10 }\n')
  },
  {
    id: 'ac4',
    rule: 'ac',
    what: 'confirm asking a context it did not make',
    file: () => `${APP}/App/OwnerCheck.swift`,
    edit: (src) => src.replace(/(func confirm\(reason: String\) async -> OwnerAnswer \{\n[ \t]*let context: any OwnerContext = )contexts\?\(\) \?\? LAContext\(\)/, '$1contexts?() ?? Self.kept')
  },
  {
    id: 'ac5',
    rule: 'ac',
    what: 'a second owner check in the app, one that always says yes',
    file: () => `${APP}/App/OwnerCheck.swift`,
    edit: append('struct P317AlwaysYes: OwnerCheck {\n    func kind() -> OwnerKind { .faceID }\n    func confirm(reason: String) async -> OwnerAnswer { .confirmed }\n}\n')
  },
  {
    id: 'ac6',
    rule: 'ac',
    what: 'a runner run outside the confirmed case',
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) => src.replace('        runner.task = task\n        pressing = task', '        Task { await runner.run { _, _ in } }\n        runner.task = task\n        pressing = task')
  },
  {
    id: 'ac7',
    rule: 'ac',
    what: 'the owner check named in Settings',
    file: () => `${APP}/Screens/SettingsScreen.swift`,
    edit: append('private let p317Check: any OwnerCheck = DeviceOwnerCheck()\n')
  },
  {
    id: 'ac8',
    rule: 'ac',
    what: 'a stored Face ID switch',
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: append('let p317FaceKey = "faceIDOnEnd"\n')
  },
  {
    id: 'ac9',
    rule: 'ac',
    what: "Face ID's purpose string reworded",
    file: () => INFO,
    edit: (src) => src.replace('Tortie asks for Face ID before it ends a session on your Mac.', 'Tortie uses Face ID.')
  },
  {
    id: 'ac10',
    rule: 'ac',
    what: "kind() drawing the hardware's mark unasked, so a phone with no face enrolled shows Face ID's (the verify's E3)",
    file: () => `${APP}/App/OwnerCheck.swift`,
    edit: (src) => src.replace(/\n[ \t]*var biometryError: NSError\?\n[ \t]*guard context\.canEvaluatePolicy\(\.deviceOwnerAuthenticationWithBiometrics, error: &biometryError\) else \{\n[ \t]*return \.passcode\n[ \t]*\}/, '')
  },
  {
    id: 'ac11',
    rule: 'ac',
    what: 'the biometrics-only policy asked outside kind(), where nothing it answers picks a glyph',
    file: () => `${APP}/App/OwnerCheck.swift`,
    edit: (src) => src.replace('    func confirm(reason: String) async -> OwnerAnswer {\n', '    func confirm(reason: String) async -> OwnerAnswer {\n        var p317: NSError?\n        _ = LAContext().canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &p317)\n')
  },
  // The tests round: the End press says off when it is drawn off (the
  // reverify's B4 took the modifier out with every gate green).
  {
    id: 'ac12',
    rule: 'ac',
    what: "the End press's .disabled taken out, so a row drawn off reads enabled and can be pressed (the reverify's B4)",
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) => src.replace(/\n[ \t]*\.disabled\(row == \.off\)/, '')
  },
  {
    id: 'ac13',
    rule: 'ac',
    what: 'the End press disabled when its row is ON, and pressable when it is drawn off',
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) => src.replace('.disabled(row == .off)', '.disabled(row == .on)')
  },
  {
    id: 'e21',
    rule: 'e',
    what: "a device spelling of Face ID's pinned purpose string, read on a phone in place of the one checked",
    file: () => INFO,
    edit: (src) => src.replace('<key>NSFaceIDUsageDescription</key>', '<key>NSFaceIDUsageDescription~iphone</key>\n\t<string>p317</string>\n\t<key>NSFaceIDUsageDescription</key>')
  },
  // (ad) the list that only shrinks, and nothing sent after the app left.
  {
    id: 'ad1',
    rule: 'ad',
    what: "the runner's targets made a var",
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) => src.replace(/(final class EndRunner \{[\s\S]*?)let targets: \[String\]/, '$1var targets: [String]')
  },
  {
    id: 'ad2',
    rule: 'ad',
    what: "the runner's targets grown after the confirm",
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) => src.replace(/(final class EndRunner \{[\s\S]*?)(\n[ \t]*func stop\(\) \{)/, '$1\n    func p317Grow(_ id: String) { targets.append(id) }$2')
  },
  {
    id: 'ad3',
    rule: 'ad',
    what: 'a second await in each turn of the run',
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) => src.replace('report(id, .wrote(result))', 'report(id, .wrote(result))\n            await Task.yield()')
  },
  {
    id: 'ad4',
    rule: 'ad',
    what: 'stopRequested read only after the first write',
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) =>
      src.replace(
        /([ \t]*)if stopRequested \{\n([ \t]*)report\(id, \.notRun\)\n[ \t]*continue\n[ \t]*\}\n([ \t]*report\(id, \.ending\)\n[ \t]*let result = await writer\.end\(id, batch: batch\)\n)/,
        '$3$1if stopRequested {\n$2report(id, .notRun)\n$2continue\n$1}\n'
      )
  },
  {
    id: 'ad5',
    rule: 'ad',
    what: 'stopRequested set back to false',
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) => src.replace(/(final class EndRunner \{[\s\S]*?)(\n[ \t]*func stop\(\) \{)/, '$1\n    func p317Resume() { stopRequested = false }$2')
  },
  {
    id: 'ad6',
    rule: 'ad',
    what: "a stop that leaves the runner's task running",
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) => src.replace(/(\n[ \t]*stopRequested = true)\n[ \t]*task\?\.cancel\(\)/, '$1')
  },
  {
    id: 'ad7',
    rule: 'ad',
    what: "the single End's runner never registered, so a trip to the background during Face ID cannot stop it",
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) => src.replace(/\n[ \t]*registry\?\.register\(runner\)\n/, '\n')
  },
  {
    id: 'ad8',
    rule: 'ad',
    what: "End these' runner registered only after the owner check answered",
    file: () => `${APP}/Screens/EndBatch.swift`,
    edit: (src) => src.replace(/\n[ \t]*setup\.registry\.register\(runner\)\n/, '\n').replace('            case .confirmed:\n', '            case .confirmed:\n                registry.register(runner)\n')
  },
  {
    id: 'ad9',
    rule: 'ad',
    what: 'wentAway that stops no runner',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace(/\n[ \t]*for runner in liveRunners \{\n[ \t]*runner\.stopRequested = true\n[ \t]*runner\.task\?\.cancel\(\)\n[ \t]*\}\n/, '\n')
  },
  {
    id: 'ad10',
    rule: 'ad',
    what: "wentAway that sets stopRequested and leaves each runner's task, so a handshake it resumes could send",
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace(/(\n[ \t]*runner\.stopRequested = true)\n[ \t]*runner\.task\?\.cancel\(\)/, '$1')
  },
  {
    id: 'ad12',
    rule: 'ad',
    what: 'the targets persisted',
    file: () => `${APP}/Screens/EndBatch.swift`,
    edit: (src) => src.replace('setup.registry.register(runner)', 'setup.registry.register(runner)\n        UserDefaults.standard.set(confirm.targets, forKey: "p317")')
  },
  // (t) widened: the writes present the identity, and the hostile write arms.
  {
    id: 't10',
    rule: 't',
    what: 'a write that presents no client identity',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('identity: door.identity, limits: limits, write: true', 'identity: nil, limits: limits, write: true')
  },
  {
    id: 't11',
    rule: 't',
    what: "a hostile door's write arm dropped",
    file: () => 'build/p316/hostile-door.mjs',
    edit: (src) => src.replace(/\n\s*'write-cut': \{[^\n]*\},?\n/, '\n')
  },
  {
    id: 't12',
    rule: 't',
    what: "a hostile write arm expecting a door sentence the door does not say",
    file: () => 'build/p316/hostile-door.mjs',
    edit: (src) => src.replace(/('write-malformed-empty': \{[^\n]*door: \[)'unreadable'(\])/, "$1'vanished'$2")
  },
  // (v) widened: End's line is always a sentence.
  {
    id: 'v6',
    rule: 'v',
    what: 'endSentence optional, so a write result could draw nothing',
    file: () => `${APP}/Screens/DoorWords.swift`,
    edit: (src) => src.replace('static func endSentence(for result: WriteResult) -> String {', 'static func endSentence(for result: WriteResult) -> String? {')
  },
  {
    id: 'v7',
    rule: 'v',
    what: 'a write result with no sentence of its own',
    file: () => `${APP}/Screens/DoorWords.swift`,
    edit: (src) => src.replace(/(static func endSentence\(for result: WriteResult\) -> String \{[\s\S]*?)\n[ \t]*case \.noAnswer:\n[ \t]*return Copy\.endNoAnswer/, '$1')
  },
  {
    id: 'v8',
    rule: 'v',
    what: "End's line emptied when Face ID did not confirm",
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) => src.replace('self?.line = Copy.endNotConfirmed', 'self?.line = ""')
  },
  // (k): End these' counts are .count and Copy's composers; an operator planted there is read.
  {
    id: 'k8',
    rule: 'k',
    what: "an unnamed count operator in End these",
    file: () => `${APP}/Screens/EndBatch.swift`,
    edit: append('func p317AblationCount(_ n: Int) -> Int { n + 1 }\n')
  },
  // -------------------------------------------------------------------------
  // PHASE 318: a reply from the phone, with no Face ID (build/p318/SPEC.md §6.3).
  // -------------------------------------------------------------------------
  // (ab) widened: three writes through the one path.
  {
    id: 'ab15',
    rule: 'ab',
    what: 'a press body built outside signedPost',
    file: () => `${APP}/Screens/Reply.swift`,
    edit: append('func p318AblationBody() -> ChooseBody { ChooseBody(mark: "", marker: "", question: "", session: "", write: "") }\n')
  },
  {
    id: 'ab16',
    rule: 'ab',
    what: 'a sixth key in the press body',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace(/(struct ChooseBody: Encodable[^{]*\{\n)/, '$1    let face: Bool\n')
  },
  {
    id: 'ab17',
    rule: 'ab',
    what: 'a message posted twice by its one caller',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('        await signedPost(route: .say(session: sessionId, text: text), door: door, limits: limits, write: write)', '        _ = await signedPost(route: .say(session: sessionId, text: text), door: door, limits: limits, write: write)\n        return await signedPost(route: .say(session: sessionId, text: text), door: door, limits: limits, write: write)')
  },
  // (ae) the reply writes.
  {
    id: 'ae1',
    rule: 'ae',
    what: "the writer's say called a second time, outside the runner",
    file: () => `${APP}/Screens/Reply.swift`,
    edit: (src) => src.replace(/(\n)(\s*)(let runner = ReplyRunner\(verb: \.say\()/, (m, nl, sp, rest) => `${nl}${sp}Task { _ = await writer.say(sessionId, text: text, write: nil) }${nl}${sp}${rest}`)
  },
  {
    id: 'ae2',
    rule: 'ae',
    what: "the writer's choose called outside the runner",
    file: () => `${APP}/Screens/Reply.swift`,
    edit: (src) => src.replace(/(\n)(\s*)(phase = \.pressing\(marker\)\n)/, (m, nl, sp, rest) => `${nl}${sp}Task { _ = await writer.choose(sessionId, question: question, mark: mark, marker: marker) }${nl}${sp}${rest}`)
  },
  {
    id: 'ae3',
    rule: 'ae',
    what: 'his words trimmed before they are sent',
    file: () => `${APP}/Screens/Reply.swift`,
    edit: (src) => src.replace(/let words = text\n/, 'let words = text.trimmingCharacters(in: .whitespacesAndNewlines)\n')
  },
  {
    id: 'ae4',
    rule: 'ae',
    what: 'smart dashes left on in the message box',
    file: () => `${APP}/Screens/MessageStrip.swift`,
    edit: (src) => src.replace(/\n[ \t]*view\.smartDashesType = \.no\n/, '\n')
  },
  {
    id: 'ae5',
    rule: 'ae',
    what: 'Send not off while a write runs',
    file: () => `${APP}/Screens/MessageStrip.swift`,
    edit: (src) => src.replace('.disabled(model.text.isEmpty || model.phase != .idle)', '.disabled(model.text.isEmpty)')
  },
  {
    id: 'ae6',
    rule: 'ae',
    what: 'the command Yes runs cut to two lines',
    file: () => `${APP}/Screens/SessionScreen.swift`,
    edit: (src) => src.replace('Words(command, .body, Tokens.textPrimary, lines: nil)', 'Words(command, .body, Tokens.textPrimary, lines: 2)')
  },
  {
    id: 'ae7',
    rule: 'ae',
    what: "an option's text cut to one line",
    file: () => `${APP}/Screens/SessionScreen.swift`,
    edit: (src) => src.replace('Words(option.text, .body, ink, lines: nil)', 'Words(option.text, .body, ink, lines: 1)')
  },
  // (af) no owner check on a reply ("Only for End").
  {
    id: 'af1',
    rule: 'af',
    what: 'a press that asks Face ID first',
    file: () => `${APP}/Screens/Reply.swift`,
    edit: (src) => src.replace(/(\n)(\s*)(phase = \.pressing\(marker\)\n)/, (m, nl, sp, rest) => `${nl}${sp}Task { _ = await DeviceOwnerCheck().confirm(reason: Copy.send) }${nl}${sp}${rest}`)
  },
  {
    id: 'af2',
    rule: 'af',
    what: 'LocalAuthentication in the message strip',
    file: () => `${APP}/Screens/MessageStrip.swift`,
    edit: (src) => src.replace('import SwiftUI\n', 'import LocalAuthentication\nimport SwiftUI\n')
  },
  {
    id: 'af3',
    rule: 'af',
    what: 'the owner check asked by the choice press',
    file: () => `${APP}/Screens/SessionScreen.swift`,
    edit: (src) => src.replace(/(\n)(\s*)(reply\.press\(option\.marker, offer: offer, reread: reread\))/, (m, nl, sp, rest) => `${nl}${sp}Task { _ = await ownerCheck.confirm(reason: Copy.send) }${nl}${sp}${rest}`)
  },
  // (ag) a reply is sent once or not at all.
  {
    id: 'ag1',
    rule: 'ag',
    what: 'a message runner registered after its task starts',
    file: () => `${APP}/Screens/Reply.swift`,
    edit: (src) => src.replace(/(write: reusing\?\.write\), writer: writer\)\n)\s*registry\?\.registerReply\(runner\)\n([\s\S]*?)(\n[ \t]*runner\.task = task\n)/, '$1$2$3        registry?.registerReply(runner)\n')
  },
  {
    id: 'ag2',
    rule: 'ag',
    what: 'wentAway that stops no reply',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace(/\n[ \t]*for runner in liveReplies \{\n[ \t]*runner\.stop\(\)\n[ \t]*\}\n/, '\n')
  },
  {
    id: 'ag3',
    rule: 'ag',
    what: 'a message persisted',
    file: () => `${APP}/Screens/Reply.swift`,
    edit: (src) => src.replace(/let words = text\n/, 'let words = text\n        UserDefaults.standard.set(words, forKey: "p318")\n')
  },
  {
    id: 'ag4',
    rule: 'ag',
    what: 'a send while one runs',
    file: () => `${APP}/Screens/Reply.swift`,
    edit: (src) => src.replace('guard phase == .idle, !text.isEmpty else { return }', 'guard !text.isEmpty else { return }')
  },
  {
    id: 'ag5',
    rule: 'ag',
    what: "the kept window past the Mac's ledger",
    file: () => `${APP}/Screens/Reply.swift`,
    edit: (src) => src.replace(/(static let keptSayWindow: TimeInterval = )60/, '$1120')
  },
  {
    id: 'ag6',
    rule: 'ag',
    what: 'a say kept on any refusal, not only busy on a kept id',
    file: () => `${APP}/Screens/Reply.swift`,
    edit: (src) => src.replace('kept = answer.outcome == .busy ? reusing : nil', 'kept = reusing')
  },
  {
    id: 'ag7',
    rule: 'ag',
    what: "a say handed an id that is no kept say's",
    file: () => `${APP}/Screens/Reply.swift`,
    edit: (src) => src.replace('write: reusing?.write), writer: writer)', 'write: sessionId), writer: writer)')
  },
  {
    id: 'ag8',
    rule: 'ag',
    what: 'a press that sends an id of its own',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('        return await signedPost(route: route, door: door, limits: limits, write: nil).result', '        return await signedPost(route: route, door: door, limits: limits, write: question).result')
  },
  {
    id: 'ag9',
    rule: 'ag',
    what: 'the kept words held as a String, which calls é and e with a combining acute equal',
    file: () => `${APP}/Screens/Reply.swift`,
    edit: (src) => src.replace(/(struct KeptSay[^{]*\{[\s\S]*?)let bytes: \[UInt8\]/, '$1let bytes: String')
  },
  // (t) widened: the hostile reply arms.
  {
    id: 't13',
    rule: 't',
    what: "a hostile door's reply arm dropped",
    file: () => 'build/p316/hostile-door.mjs',
    edit: (src) => src.replace(/\n\s*'reply-cut': \{[^\n]*\},?\n/, '\n')
  },
  {
    id: 't14',
    rule: 't',
    what: 'a hostile reply arm that lets a press POST twice',
    file: () => 'build/p316/hostile-door.mjs',
    edit: (src) => src.replace(/('reply-404': \{[^\n]*posts: )1/, '$12')
  },
  // (v) widened: a reply's line is always a sentence.
  {
    id: 'v9',
    rule: 'v',
    what: 'replySentence optional, so a reply could draw nothing',
    file: () => `${APP}/Screens/DoorWords.swift`,
    edit: (src) => src.replace('static func replySentence(for result: WriteResult) -> String {', 'static func replySentence(for result: WriteResult) -> String? {')
  },
  {
    id: 'v10',
    rule: 'v',
    what: 'a reply result with no sentence of its own',
    file: () => `${APP}/Screens/DoorWords.swift`,
    edit: (src) => src.replace(/(static func replySentence\(for result: WriteResult\) -> String \{[\s\S]*?)\n[ \t]*case \.notTaken:\n[ \t]*return Copy\.replyNotTaken/, '$1')
  },
  {
    id: 'v11',
    rule: 'v',
    what: 'the message line emptied after a message landed',
    file: () => `${APP}/Screens/Reply.swift`,
    edit: (src) => src.replace('sayLine = Copy.replySent', 'sayLine = ""')
  },
  // ---- PHASE 316.7 (build/p3167/SPEC.md §8.4): one arm per clause of (aa),
  // and one more for each clause with a second half.
  // (aa1) nothing ordered or dropped on the phone.
  {
    id: 'aa1',
    rule: 'aa',
    what: 'a .sorted on the Sessions tab',
    file: () => SESSIONS_SCREEN,
    edit: append('func p3167Sorted(_ rows: [PocketSessionsRow]) -> [PocketSessionsRow] { rows.sorted { $0.name < $1.name } }\n')
  },
  // (aa2) UserDefaults in SessionsChoices.swift alone, three keys, closed words.
  {
    id: 'aa2',
    rule: 'aa',
    what: 'UserDefaults named in SessionsScreen.swift',
    file: () => SESSIONS_SCREEN,
    edit: append('func p3167Kept() -> UserDefaults { .standard }\n')
  },
  {
    id: 'aa2b',
    rule: 'aa',
    what: 'a fourth key',
    file: () => SESSIONS_CHOICES,
    edit: (src) => afterLastLine(/\bdefaults\s*\.\s*set\s*\(/, (indent) => `${indent}defaults.set(SessionsShow.all.rawValue, forKey: "tortie.sessions.agent")`)(src)
  },
  {
    id: 'aa2c',
    rule: 'aa',
    what: 'a string the door answered stored beside the three words',
    file: () => SESSIONS_CHOICES,
    edit: (src) => src.replace(/\n([ \t]*)func save\(/, '\n$1func p3167Keep(_ answer: PocketSessionsAnswer) { defaults.set(answer.rows.first?.name, forKey: Self.showKey) }\n$1func save(')
  },
  // (aa3) no free text, no other storage.
  {
    id: 'aa3',
    rule: 'aa',
    what: 'a TextField on the Sessions tab',
    file: () => SESSIONS_SCREEN,
    edit: append('struct P3167Search: View {\n    @State private var text = ""\n    var body: some View { TextField(Copy.sessions, text: $text) }\n}\n')
  },
  // (aa4) one target, five parameters in order, every value through queryValue.
  {
    id: 'aa4',
    rule: 'aa',
    what: "the target's parameters swapped, sort first and show third",
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => {
      // Inside sessionsTarget's body alone, never its doc comment.
      const at = /\bfunc\s+sessionsTarget\s*\(/.exec(src);
      const open = at === null ? -1 : src.indexOf('{', at.index);
      const close = open === -1 ? -1 : closeOf(src, open);
      if (close === -1) return src;
      const body = src.slice(open, close + 1);
      if (!body.includes('/v1/sessions?show=') || !body.includes('&sort=')) return src;
      const swapped = body.replace('/v1/sessions?show=', '/v1/sessions?p3167=').replace('&sort=', '&show=').replace('/v1/sessions?p3167=', '/v1/sessions?sort=');
      return `${src.slice(0, open)}${swapped}${src.slice(close + 1)}`;
    }
  },
  {
    id: 'aa4b',
    rule: 'aa',
    what: 'the agent written into the target bare, not through queryValue',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace(/agent=\\\((?:(?:Self|DoorClient)\.)?queryValue\(([^()]*)\)\)/, 'agent=\\($1)')
  },
  // (aa5) the UserDefaults reason.
  {
    id: 'aa5',
    rule: 'aa',
    what: 'the UserDefaults reason CA92.2',
    file: appManifest,
    edit: (src) => src.replace('<string>CA92.1</string>', '<string>CA92.2</string>')
  },
  // (aa6) nothing but a row's tap while End these takes taps.
  {
    id: 'aa6',
    rule: 'aa',
    what: "the menu's .disabled( taken out",
    file: () => SESSIONS_SCREEN,
    edit: dropFromChain(/\.accessibilityIdentifier\(\s*ID\.listMenu\s*\)/, 'disabled')
  },
  {
    // The fix round (2026-10-03): the header as first built, a view taking
    // taps by .onTapGesture, read as an enabled button while End these took
    // taps, its .disabled( notwithstanding.
    id: 'aa6b',
    rule: 'aa',
    what: 'a project header taking taps by .onTapGesture, not a Button',
    file: () => SESSIONS_SCREEN,
    edit: (src) => src.replace(/Button\(action:\s*tapped\)\s*\{\s*Color\.clear\s*\.contentShape\(Rectangle\(\)\)\s*\}\s*\.buttonStyle\(\.plain\)/, 'Color.clear\n                    .contentShape(Rectangle())\n                    .onTapGesture(perform: tapped)')
  },
  {
    // The fix round's own first try: the header wrapped in a Button made a
    // container, which read enabled to XCUITest on iOS 26.3 all the same.
    id: 'aa6c',
    rule: 'aa',
    what: "a project header's Button made a container by .accessibilityElement(children: .contain)",
    file: () => SESSIONS_SCREEN,
    edit: (src) => src.replace(/(\.disabled\(batch\?\.takesTaps \?\? false\))(\s*\.accessibilityLabel\(Text\(verbatim:\s*group\.label\)\))/, '$1\n                .accessibilityElement(children: .contain)$2')
  },
  // (aa7) .olderMac set once, after the list answered, under its .loaded state.
  {
    id: 'aa7',
    rule: 'aa',
    what: '.olderMac set before the list answered (its await taken out)',
    file: () => SESSIONS_SCREEN,
    edit: olderMacUnawaited
  },
  // (aa8) the hold.
  {
    id: 'aa8',
    rule: 'aa',
    what: "load()'s batchHeld check taken out, so a pull replaces the drawing under End these",
    file: () => SESSIONS_SCREEN,
    edit: dropHold
  },
  {
    id: 'aa8b',
    rule: 'aa',
    what: 'Done no longer clearing batchHeld before it reads',
    file: () => `${APP}/Screens/EndBatch.swift`,
    edit: (src) => src.replace(/\n[ \t]*(?:self\.)?list\.batchHeld\s*=\s*false[ \t]*(?=\n)/, '')
  },
  {
    id: 'aa8c',
    rule: 'aa',
    what: "nothing setting batchHeld from End these' phase",
    file: () => `${APP}/Screens/EndBatch.swift`,
    edit: (src) => src.replace(/\b(?:self\.)?list\.batchHeld\s*=\s*([^\n;}]*\bphase\b[^\n;}]*)/, '_ = $1')
  },
  // (aa9) one stored Task, cancelled before another.
  {
    id: 'aa9',
    rule: 'aa',
    what: "the stored read's .cancel() taken out",
    file: () => SESSIONS_SCREEN,
    edit: dropCancel
  },
  // (aa10) one End these attachment over both faces; the tab draws SessionsTab.
  {
    id: 'aa10',
    rule: 'aa',
    what: 'a second .endBatch( on SessionsScreen',
    file: () => SESSIONS_SCREEN,
    edit: (src) => {
      const at = src.indexOf('struct SessionsScreen');
      const refresh = at === -1 ? null : /\n([ \t]*)\.refreshable\b/.exec(src.slice(at));
      if (refresh === null) return src;
      const k = at + refresh.index;
      return `${src.slice(0, k)}\n${refresh[1]}.endBatch(nil, list: model)${src.slice(k)}`;
    }
  },
  {
    id: 'aa10b',
    rule: 'aa',
    what: 'the Sessions tab building a ListScreen of its own',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace(/\bSessionsTab\s*\(/, 'ListScreen(')
  },
  // -------------------------------------------------------------------------
  // PHASE 337, the Screen (build/p337/SPEC.md §6.4): (ah) to (ap), and the
  // widened halves of (a), (ab), (ac), (e), (k), (p), (t) and (v).
  // -------------------------------------------------------------------------
  {
    id: 'ah1',
    rule: 'ah',
    what: 'the screen target asks for a width',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('        if let since { target += "&since=\\(queryValue(since))" }', '        if let since { target += "&since=\\(queryValue(since))" }\n        target += "&cols=120"')
  },
  {
    id: 'ah2',
    rule: 'ah',
    what: 'the keys body carries a size',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('struct KeysBody: Encodable, Sendable {\n    let dialog: String?', 'struct KeysBody: Encodable, Sendable {\n    let rows: Int\n    let dialog: String?')
  },
  {
    id: 'ah3',
    rule: 'ah',
    what: "the Screen's door read takes a size",
    file: () => `${APP}/Screens/DoorWords.swift`,
    edit: (src) => src.replace('func read(since: String?) async throws -> PocketScreenAnswer', 'func read(since: String?, cols: Int) async throws -> PocketScreenAnswer')
  },
  {
    id: 'ai1',
    rule: 'ai',
    what: 'a second keys write started while one is in flight',
    file: () => `${APP}/Screens/ScreenKeys.swift`,
    edit: (src) => src.replace('guard !stopped, inFlight == nil, gapWait == nil,', 'guard !stopped, gapWait == nil,')
  },
  {
    id: 'ai2',
    rule: 'ai',
    what: 'the keys paced at 50 ms',
    file: () => `${APP}/Screens/ScreenKeys.swift`,
    edit: (src) => src.replace('static let minGap: Duration = .milliseconds(100)', 'static let minGap: Duration = .milliseconds(50)')
  },
  {
    id: 'ai3',
    rule: 'ai',
    what: 'a 65th item allowed in a write',
    file: () => `${APP}/Screens/ScreenKeys.swift`,
    edit: (src) => src.replace('static let mostItems = 64', 'static let mostItems = 65')
  },
  {
    id: 'ai4',
    rule: 'ai',
    what: 'a named key batched with what follows it',
    file: () => `${APP}/Screens/ScreenKeys.swift`,
    edit: (src) => src.replace('if first.standsAlone {', 'if first.standsAlone && pending.count == 1 {')
  },
  {
    id: 'ai5',
    rule: 'ai',
    what: 'the lock inside a question read off a clock',
    file: () => `${APP}/Screens/ScreenKeys.swift`,
    edit: (src) => src.replace('case .done?: drawn.turn == lastTurn', 'case .done?: Date() < Date.distantFuture')
  },
  {
    id: 'ai6',
    rule: 'ai',
    what: 'the app leaving stops no key sender',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace(/\n[ \t]*for sender in liveKeys \{\n[ \t]*sender\.stop\(\)\n[ \t]*\}/, '')
  },
  {
    id: 'ai7',
    rule: 'ai',
    what: 'a 36th key name, Meta-x, the Mac never takes',
    file: () => `${APP}/Door/Contract.swift`,
    edit: (src) => src.replace('    case controlZ = "C-z"', '    case controlZ = "C-z"\n    case metaX = "M-x"')
  },
  {
    id: 'ai8',
    rule: 'ai',
    what: 'the C1 controls let through a text item',
    file: () => `${APP}/Door/Contract.swift`,
    edit: (src) => src.replace('scalar.value <= 0x1f || (scalar.value >= 0x7f && scalar.value <= 0x9f)', 'scalar.value <= 0x1f || scalar.value == 0x7f')
  },
  {
    id: 'aj1',
    rule: 'aj',
    what: 'autocorrection on in the hidden field',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('autocorrectionType = .no', 'autocorrectionType = .yes')
  },
  {
    id: 'aj2',
    rule: 'aj',
    what: 'smart dashes left at their default',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('smartDashesType = .no', 'smartDashesType = .default')
  },
  {
    id: 'aj3',
    rule: 'aj',
    what: 'a drop taken into the field',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('textDropDelegate = ScreenDropRefusal.shared', '_ = ScreenDropRefusal.shared')
  },
  {
    id: 'aj4',
    rule: 'aj',
    what: 'Paste and Go offered',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace(/\n[ \t]*#selector\(UIResponderStandardEditActions\.pasteAndGo\(_:\)\),/, '')
  },
  {
    id: 'aj5',
    rule: 'aj',
    what: 'an IME composition sent while it is marked',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('guard !marked, !dictating else { return Change() }', 'guard !dictating else { return Change() }')
  },
  {
    id: 'aj6',
    rule: 'aj',
    what: 'a pasted block of lines typed line by line',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('if Self.holdsLineBreak(text) {\n            return Change()', 'if text.contains(Self.carriageReturn) {\n            return Change()')
  },
  {
    // THE FIX ROUND OF 2026-10-06: the shape that shipped, a line break asked
    // for Character by Character, which "\r\n" (one Character) walks past.
    id: 'aj6b',
    rule: 'aj',
    what: 'a Windows line break missed by a Character search',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('text.unicodeScalars.contains { lineBreakScalars.contains($0) }', 'text.contains(lineFeed) || text.contains(carriageReturn)')
  },
  {
    id: 'aj6c',
    rule: 'aj',
    what: 'the carriage return left out of the line breaks',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('Set(lineFeed.unicodeScalars).union(carriageReturn.unicodeScalars)', 'Set(lineFeed.unicodeScalars)')
  },
  {
    id: 'aj6d',
    rule: 'aj',
    what: 'a field holding a line break read as text',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('if Self.holdsLineBreak(text) {\n            reset()', 'if text == Self.lineFeed {\n            reset()')
  },
  {
    id: 'aj7',
    rule: 'aj',
    what: 'the field left with inline predictions on',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('        inlinePredictionType = .no\n', '')
  },
  {
    id: 'aj8',
    rule: 'aj',
    what: 'Writing Tools allowed to rewrite the field',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('writingToolsBehavior = .none', 'writingToolsBehavior = .complete')
  },
  {
    id: 'aj9',
    rule: 'aj',
    what: 'the field given its default paste configuration',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('        pasteConfiguration = nil\n', '')
  },
  {
    id: 'aj10',
    rule: 'aj',
    what: "dictation's partial text sent while it runs",
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('guard !marked, !dictating else { return Change() }', 'guard !marked else { return Change() }')
  },
  {
    id: 'aj11',
    rule: 'aj',
    what: 'a carriage return made Enter outside replacing',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('guard !marked, !dictating else { return Change() }', 'guard !marked, !dictating else { return Change() }\n        if text == Self.carriageReturn { return Change(items: [.key(.enter)], clear: true) }')
  },
  {
    id: 'aj12',
    rule: 'aj',
    what: 'Backspace on an empty field sends nothing',
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('let change = state.backspace(marked: markedTextRange != nil)', 'let change = state.changed(to: text ?? "", marked: markedTextRange != nil, dictating: dictating)')
  },
  {
    id: 'aj13',
    rule: 'aj',
    what: "the keyboard taken inside SwiftUI's update again, which froze the app over the question's tray (Phase 337.1's fix round)",
    file: () => `${APP}/Screens/ScreenKeyField.swift`,
    edit: (src) => src.replace('        let coordinator = context.coordinator\n        DispatchQueue.main.async { [weak field] in\n            guard let field else { return }\n            coordinator.settle(field)\n        }\n', '        context.coordinator.settle(field)\n        field.becomeFirstResponder()\n')
  },
  {
    id: 'ak1',
    rule: 'ak',
    what: 'a kept line fresh for 6 s, past the door’s own 5',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('static let freshFor: TimeInterval = 4', 'static let freshFor: TimeInterval = 6')
  },
  {
    id: 'ak2',
    rule: 'ak',
    what: 'a kept line reused however long it sat',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('return Date().timeIntervalSince(since) < Self.freshFor', 'return since <= Date()')
  },
  {
    id: 'ak3',
    rule: 'ak',
    what: 'an idle line never closed by the phone',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('queue.asyncAfter(deadline: .now() + Double(Self.freshFor), execute: timer)', '_ = timer')
  },
  {
    id: 'ak4',
    rule: 'ak',
    what: 'a stray answer kept for the next request',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('guard let exchange = self.current else {', 'guard let exchange = self.current ?? Optional<DoorExchange>.none else {')
  },
  {
    id: 'ak5',
    rule: 'ak',
    what: 'an answer saying Connection: close kept',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('whole: !reader.closes)', 'whole: true)')
  },
  {
    id: 'ak6',
    rule: 'ak',
    what: 'a read asked again after any failure, not only a reused line closed before an answer',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('guard line != nil, first.reused, case .failure(let failure) = first.result,', 'guard line != nil, case .failure(let failure) = first.result,')
  },
  {
    id: 'ak7',
    rule: 'ak',
    what: 'every exchange asks to keep its connection',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('keepAlive: Bool = false', 'keepAlive: Bool = true')
  },
  {
    id: 'al1',
    rule: 'al',
    what: 'Copy reads the pasteboard back',
    file: () => `${APP}/Screens/ScreenSelection.swift`,
    edit: (src) => src.replace('UIPasteboard.general.string = text', 'UIPasteboard.general.string = text\n        _ = UIPasteboard.general.hasStrings')
  },
  {
    id: 'al2',
    rule: 'al',
    what: 'the pasteboard named in another Screen file',
    file: () => `${APP}/Screens/ScreenGrid.swift`,
    edit: (src) => `${src}\nfunc p337Peek() -> Bool { UIPasteboard.general.hasStrings }\n`
  },
  {
    id: 'p20',
    rule: 'p',
    what: "Copy's write to the pasteboard moved out of ScreenSelection.swift",
    file: () => `${APP}/Screens/Screen.swift`,
    edit: (src) => `${src}\nfunc p337Copy(_ text: String) {\n    UIPasteboard.general.string = text\n}\n`
  },
  {
    id: 'p21',
    rule: 'p',
    what: 'a read of the pasteboard beside Copy, in ScreenSelection.swift itself',
    file: () => `${APP}/Screens/ScreenSelection.swift`,
    edit: (src) => `${src}\nfunc p337Peek() -> String {\n    let peeked = UIPasteboard.general.string ?? ""\n    return peeked\n}\n`
  },
  {
    id: 'am1',
    rule: 'am',
    what: 'a second constructor of a colour the door names',
    file: () => `${APP}/Screens/ScreenGrid.swift`,
    edit: (src) => `${src}\nenum P337Colours {\n    static func drawn(_ rgb: String) -> Color { Tokens.bgCanvas }\n}\n`
  },
  {
    id: 'am2',
    rule: 'am',
    what: "a ScreenColor made without the seven-character reader",
    file: () => `${APP}/Door/Contract.swift`,
    edit: (src) => src.replace('private init(channels: SIMD3<UInt8>) {', 'init(channels: SIMD3<UInt8>) {')
  },
  {
    id: 'a20',
    rule: 'a',
    what: 'the Screen’s page token taken out of Tokens.swift',
    file: () => `${APP}/Style/Tokens.swift`,
    edit: (src) => src.replace(/\bcase bgCanvas\b/, 'case bgCanvasGone')
  },
  {
    id: 'an1',
    rule: 'an',
    what: 'upside down allowed',
    file: () => INFO,
    edit: (src) => src.replace('<string>UIInterfaceOrientationLandscapeRight</string>', '<string>UIInterfaceOrientationLandscapeRight</string>\n\t\t<string>UIInterfaceOrientationPortraitUpsideDown</string>')
  },
  {
    id: 'an2',
    rule: 'an',
    what: 'landscape opened from outside the Screen',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => `${src}\n@MainActor func p337Rotate() { OrientationGate.screenOnTop = true }\n`
  },
  {
    id: 'an3',
    rule: 'an',
    what: 'the Screen leaving landscape on behind it',
    file: () => `${APP}/Screens/Screen.swift`,
    edit: (src) => src.replace('OrientationGate.screenOnTop = false', 'OrientationGate.screenOnTop = true')
  },
  {
    id: 'e20',
    rule: 'e',
    what: 'an iPhone spelling of the orientation list',
    file: () => INFO,
    edit: (src) => src.replace('\t<key>UIUserInterfaceStyle</key>', '\t<key>UISupportedInterfaceOrientations~iphone</key>\n\t<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>\n\t<key>UIUserInterfaceStyle</key>')
  },
  {
    id: 'ao1',
    rule: 'ao',
    what: 'the cover drawn only in the background, not while inactive',
    file: () => `${APP}/Screens/Screen.swift`,
    edit: (src) => src.replace('phase != .active', 'phase == .background')
  },
  {
    id: 'ao2',
    rule: 'ao',
    what: 'the cover carries words',
    file: () => `${APP}/Screens/Screen.swift`,
    edit: (src) => src.replace('.fill(Tokens.bgCanvas)', '.fill(Tokens.bgCanvas)\n            .overlay(Text(Copy.screen))')
  },
  {
    id: 'ap1',
    rule: 'ap',
    what: 'a box character transcribed as a literal',
    file: () => `${APP}/Screens/ScreenGlyphs.swift`,
    edit: (src) => `${src}\nlet p337Dashed = "${String.fromCodePoint(0x254c)}"\n`
  },
  {
    id: 'ap2',
    rule: 'ap',
    what: 'a fallback glyph scaled up to its box',
    file: () => `${APP}/Screens/ScreenRows.swift`,
    edit: (src) => src.replace('return min(1, CGFloat(box) / measured)', 'return CGFloat(box) / measured')
  },
  {
    id: 'ap3',
    rule: 'ap',
    what: 'the shapes no longer read from the Unicode names',
    file: () => `${APP}/Screens/ScreenGlyphs.swift`,
    edit: (src) => src.replace(/\.properties\.name\b/g, '.properties.nameAlias')
  },
  // (aq), REWRITTEN BY PHASE 337.1 (build/p3371/SPEC.md §6.4): the Terminal's
  // scroll view is UIKit's, never centres, and moves its offset by a delta.
  // The fix round's four SwiftUI arms left with the view they planted into.
  {
    id: 'aq1',
    rule: 'aq',
    what: 'a SwiftUI ScrollView put back in a Screen file',
    file: () => `${APP}/Screens/ScreenGrid.swift`,
    edit: append('struct P3371Back: View {\n    var body: some View { ScrollView([.horizontal, .vertical]) { EmptyView() } }\n}\n')
  },
  {
    id: 'aq2',
    rule: 'aq',
    what: "the scroll view's inset adjustment left on, so UIKit moves the rows with the keyboard",
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: (src) => src.replace('contentInsetAdjustmentBehavior = .never', 'contentInsetAdjustmentBehavior = .automatic')
  },
  {
    id: 'aq3',
    rule: 'aq',
    what: 'the single tap no longer waiting for the double',
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: (src) => src.replace('        single.require(toFail: double)\n', '')
  },
  {
    id: 'aq4',
    rule: 'aq',
    what: 'the hosting view taking touches',
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: (src) => src.replace('host.view.isUserInteractionEnabled = false', 'host.view.isUserInteractionEnabled = true')
  },
  {
    id: 'aq5',
    rule: 'aq',
    what: 'the offset delta applied outside layoutSubviews, while scrolling',
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: (src) => src.replace('        pinned = contentOffset.y >= CGFloat(maxOffsetY) - 0.5\n', '        pinned = contentOffset.y >= CGFloat(maxOffsetY) - 0.5\n        apply(above: CGPoint(x: 0, y: 0))\n')
  },
  {
    id: 'aq6',
    rule: 'aq',
    what: 'the delta set as the offset instead of added to the current one',
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: (src) => src.replace('contentOffset = CGPoint(x: CGFloat(contentOffset.x) + delta.x, y: CGFloat(contentOffset.y) + delta.y)', 'contentOffset = delta')
  },
  {
    id: 'aq7',
    rule: 'aq',
    what: "D25's pad removed, so a page landing above moves the live rows (§Attack B5)",
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: (src) => src.replace('height: CGFloat(CGFloat(rows) * now.height) + pad)', 'height: CGFloat(CGFloat(rows) * now.height))')
  },
  {
    id: 'aq8',
    rule: 'aq',
    what: "a long press's point read in the view rather than the content",
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: (src) => src.replace('press.location(in: contentView)', 'press.location(in: self)')
  },
  {
    id: 'aq9',
    rule: 'aq',
    what: 'a fourth writer of the offset, when a fling settles',
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: (src) => src.replace('    func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {\n        drawWindow(force: true)\n        settled()\n', '    func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {\n        drawWindow(force: true)\n        setContentOffset(contentOffset, animated: false)\n        settled()\n')
  },
  {
    id: 'aq10',
    rule: 'aq',
    what: 'a GeometryReader framing the rows again',
    file: () => `${APP}/Screens/ScreenGrid.swift`,
    edit: append('struct P3371Geometry: View {\n    var body: some View { GeometryReader { _ in EmptyView() } }\n}\n')
  },
  // (ar) THE KEYBOARD NEVER MOVES THE TERMINAL'S FRAME (D24, §Attack B4).
  {
    id: 'ar1',
    rule: 'ar',
    what: "the first draft's shape: the opt-out on the representable alone, with the line and the tray below it",
    file: () => `${APP}/Screens/Screen.swift`,
    edit: (src) =>
      src
        .replace('        .ignoresSafeArea(.keyboard, edges: .bottom)\n', '')
        .replace('                content\n                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)\n', '                content\n                    .ignoresSafeArea(.keyboard, edges: .bottom)\n                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)\n')
  },
  {
    id: 'ar2',
    rule: 'ar',
    what: "the indicators' inset written outside keyboardOverlap(_:)",
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: (src) => src.replace('        super.layoutSubviews()\n', '        super.layoutSubviews()\n        verticalScrollIndicatorInsets.bottom = overlap\n')
  },
  {
    id: 'ar3',
    rule: 'ar',
    what: 'the line and the back-to-live button no longer padded by the overlap',
    file: () => `${APP}/Screens/Screen.swift`,
    edit: (src) => src.replace('.padding(.bottom, overlap)', '.padding(.bottom, 0)')
  },
  {
    id: 'ar4',
    rule: 'ar',
    what: "the keyboard's frame taken in the screen's coordinates, not converted into the view",
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: (src) => src.replace('let mine = convert(end, from: screen.coordinateSpace)', 'let mine = end')
  },
  {
    id: 'ar5',
    rule: 'ar',
    what: 'the overlap never published to the page',
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: (src) => src.replace('        actions?.overlap(covered)\n', '')
  },
  {
    id: 'ar6',
    rule: 'ar',
    what: 'a second opt-out inside the page, on the tray',
    file: () => `${APP}/Screens/Screen.swift`,
    edit: (src) => src.replace('                    tray\n', '                    tray.ignoresSafeArea(.keyboard)\n')
  },
  {
    id: 'ar7',
    rule: 'ar',
    what: "the overlap never measured again when the view grows under the keyboard (the tray hiding), so the line sits behind it (Phase 337.1's fix round)",
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: (src) => src.replace('        super.layoutSubviews()\n        remeasureKeyboard()\n', '        super.layoutSubviews()\n')
  },
  {
    id: 'aq11',
    rule: 'aq',
    what: "every row of the window an element again, ~300 where 337 had 40, which quarantined and crashed the app under test on iOS 18.3 (Phase 337.1's fix round)",
    file: () => `${APP}/Screens/ScreenGrid.swift`,
    edit: (src) => src.replace('.accessibilityIdentifier(item.spoken ? item.live.map(ID.screenRow) ?? ID.screenHistoryRow(item.id) : "")', '.accessibilityIdentifier(item.live.map(ID.screenRow) ?? ID.screenHistoryRow(item.id))')
  },
  // (as) THE SCROLLBACK CLIENT (D7, D13, D25 to D28, D31).
  {
    id: 'as1',
    rule: 'as',
    what: 'cols in the scrollback target',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('&wrap=\\(wrap)', '&cols=\\(wrap)')
  },
  {
    id: 'as2',
    rule: 'as',
    what: "the overlap check removed from a page's join",
    file: () => `${APP}/Screens/ScreenScrollback.swift`,
    edit: (src) => src.replace('        guard overlapAgrees(rows, ask: ask, askedEnd: asked) else {\n            edge = .moved(Copy.scrollbackMoved)\n            return .moved\n        }\n', '')
  },
  {
    id: 'as3',
    rule: 'as',
    what: "the space check removed, so another pane's page joins (§Attack B8)",
    file: () => `${APP}/Screens/ScreenScrollback.swift`,
    edit: (src) => src.replace('page.pageWrap == wrap, page.space == space,', 'page.pageWrap == wrap,')
  },
  {
    id: 'as4',
    rule: 'as',
    what: 'two pages in flight',
    file: () => `${APP}/Screens/ScreenScrollback.swift`,
    edit: (src) => src.replace('        guard !stopped, inFlight == nil, waiting == nil,', '        guard !stopped, waiting == nil,')
  },
  {
    id: 'as5',
    rule: 'as',
    what: 'the pages paced at 0.1 s, under the Mac\'s own floor',
    file: () => `${APP}/Screens/ScreenScrollback.swift`,
    edit: (src) => src.replace('static let minGap: Duration = .milliseconds(250)', 'static let minGap: Duration = .milliseconds(100)')
  },
  {
    id: 'as6',
    rule: 'as',
    what: 'a selection point named by its place in the layout, not its absolute index',
    file: () => `${APP}/Screens/ScreenSelection.swift`,
    edit: (src) => src.replace('static func hit(_ point: CGPoint, cell: ScreenCell, columns: Int, first: Int, rows: Int)', 'static func hit(_ point: CGPoint, cell: ScreenCell, columns: Int, top: Int, rows: Int)').replace('let row = DoorNumber.sum(first, place)', 'let row = DoorNumber.sum(top, place)')
  },
  {
    id: 'as7',
    rule: 'as',
    what: 'Copy drawn over rows not yet fetched (§Attack B11)',
    file: () => `${APP}/Screens/Screen.swift`,
    edit: (src) => src.replace('!selection.isEmpty && scrollback.drawn(selection.range, picture: model.picture)', '!selection.isEmpty')
  },
  {
    id: 'as8',
    rule: 'as',
    what: '5,000 rows held',
    file: () => `${APP}/Screens/ScreenScrollback.swift`,
    edit: (src) => src.replace('static let mostHeld = 3_000', 'static let mostHeld = 5_000')
  },
  {
    id: 'as9',
    rule: 'as',
    what: 'a key sent that no longer returns the Terminal to its live rows',
    file: () => `${APP}/Screens/ScreenKeys.swift`,
    edit: (src) => src.replace('onSend?()', '_ = 0')
  },
  {
    id: 'as10',
    rule: 'as',
    what: "a live picture that no longer raises depthSeen while scrolled (§Attack B13)",
    file: () => `${APP}/Screens/ScreenScrollback.swift`,
    edit: (src) => src.replace('            depthSeen = offer.depth\n            live = max(live, offer.depth)\n', '            live = max(live, offer.depth)\n')
  },
  {
    id: 'as11',
    rule: 'as',
    what: 'the reserved top moved outside reserve(',
    file: () => `${APP}/Screens/ScreenScrollback.swift`,
    edit: (src) => src.replace('        mode = .following\n        held = [:]\n', '        mode = .following\n        top = live\n        held = [:]\n')
  },
  {
    id: 'as12',
    rule: 'as',
    what: "the Terminal's history persisted",
    file: () => `${APP}/Screens/ScreenScrollback.swift`,
    edit: append('let p3371Kept = UserDefaults.standard\n')
  },
  {
    id: 'as13',
    rule: 'as',
    what: "the history's model in a file outside the Screen* family, outside its walls (§Attack B15)",
    file: () => `${APP}/Screens/Scrollback.swift`,
    create: true,
    edit: () => 'import Foundation\n\nfinal class ScrollbackModel {}\n'
  },
  // (at) TERMINAL FIRST (D16 to D20, §Attack B6, B12).
  {
    id: 'at1',
    rule: 'at',
    what: 'Route.screen put back',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace('    case catchUp(id: String, honestLine: String?)\n', '    case catchUp(id: String, honestLine: String?)\n    case screen(id: String)\n')
  },
  {
    id: 'at2',
    rule: 'at',
    what: 'End before the Catch Me Up icon',
    file: () => `${APP}/Screens/SessionScreen.swift`,
    edit: (src) =>
      src
        .replace('            CatchUpItem { openCatchUp(drawing.outcome) }\n', '')
        .replace('            EndTopItem(model: end, offer: drawing.end, confirm: drawing.endConfirm) { await session.load() }\n        }\n', '            EndTopItem(model: end, offer: drawing.end, confirm: drawing.endConfirm) { await session.load() }\n            CatchUpItem { openCatchUp(drawing.outcome) }\n        }\n')
  },
  {
    id: 'at3',
    rule: 'at',
    what: "the tray's presses on new identifiers, so Phase 318's press arms miss them (§Attack B6)",
    file: () => `${APP}/Screens/SessionScreen.swift`,
    edit: (src) => src.replace('ID.sessionChoicePress(', 'ID.terminalChoicePress(')
  },
  {
    id: 'at4',
    rule: 'at',
    what: 'the Terminal drawn for a reader with no screen door',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace('screen && hasDoor ? .terminal : .catchUp', 'screen ? .terminal : .catchUp')
  },
  {
    id: 'at5',
    rule: 'at',
    what: 'the face decided again on a later answer, swapping the page under him',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace('guard face == nil, case .loaded', 'guard case .loaded')
  },
  {
    id: 'at6',
    rule: 'at',
    what: 'the Catch Me Up icon drawn as a word',
    file: () => `${APP}/Screens/SessionScreen.swift`,
    edit: (src) => src.replace('Image(systemName: "text.bubble")', 'Words(Copy.catchMeUp, .body, Tokens.accent)')
  },
  {
    id: 'at7',
    rule: 'at',
    what: "the session route's container no longer screen-session (§Attack B12)",
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace('        .accessibilityElement(children: .contain)\n        .accessibilityIdentifier(ID.sessionScreen)\n', '        .accessibilityElement(children: .contain)\n        .accessibilityIdentifier(ID.screen)\n')
  },
  {
    id: 'at8',
    rule: 'at',
    what: "the route's second child taken out, so the face's container folds into the route's and screen-screen never reaches the tree (Phase 337.1's fix round)",
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace('                .accessibilityIdentifier(ID.sessionRouteMark)\n', '')
  },
  // (au) THE RENAME (D21 to D23).
  {
    id: 'au1',
    rule: 'au',
    what: 'a Conversation word put back in Copy.swift',
    file: () => `${APP}/Style/Copy.swift`,
    edit: (src) => src.replace('    static let catchMeUp = "Catch Me Up"\n', '    static let catchMeUp = "Catch Me Up"\n    static let conversation = "Conversation"\n')
  },
  {
    id: 'au2',
    rule: 'au',
    what: 'Catch Me Up cased differently from the Mac\'s word',
    file: () => `${APP}/Style/Copy.swift`,
    edit: (src) => src.replace('    static let catchMeUp = "Catch Me Up"\n', '    static let catchMeUp = "Catch me up"\n')
  },
  {
    id: 'au3',
    rule: 'au',
    what: 'an accessibility identifier spelling conversation again',
    file: () => `${APP}/Screens/Identifiers.swift`,
    edit: append('extension ID {\n    static let p3371Old = "conversation-turn"\n}\n')
  },
  // Phase 337.1's widenings of earlier rules.
  {
    id: 'ak8',
    rule: 'ak',
    what: 'the side line left open when the Terminal goes away',
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace('        side.close()\n', '')
  },
  {
    id: 'ak9',
    rule: 'ak',
    what: "a page put on the side line around its gate, beside a status re-read",
    file: () => `${APP}/App/TortieApp.swift`,
    edit: (src) => src.replace('return try await sideGate.run {', 'return try await withoutGate {')
  },
  {
    id: 'ah4',
    rule: 'ah',
    what: "the Screen door's page asking for a width",
    file: () => `${APP}/Screens/DoorWords.swift`,
    edit: (src) => src.replace('func scrollback(from: Int, count: Int, depth: Int, wrap: Int, keep: ScrollbackKeep)', 'func scrollback(from: Int, count: Int, depth: Int, wrap: Int, keep: ScrollbackKeep, cols: Int)')
  },
  {
    id: 'ai9',
    rule: 'ai',
    what: 'a second minGap outside ScrollbackModel',
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: append('enum P3371Pace {\n    static let minGap: Duration = .milliseconds(10)\n}\n')
  },
  {
    id: 'x20',
    rule: 'x',
    what: "the keyboard's userInfo read outside the Terminal's one keyboard function",
    file: () => `${APP}/Screens/ScreenScroller.swift`,
    edit: append('func p3371Keyboard(_ note: Notification) -> Any? {\n    note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey]\n}\n')
  },
  {
    id: 'v30',
    rule: 'v',
    what: "a refused page's sentence made optional",
    file: () => `${APP}/Screens/DoorWords.swift`,
    edit: (src) => src.replace('static func scrollbackSentence(for failure: DoorFailure) -> String {', 'static func scrollbackSentence(for failure: DoorFailure) -> String? {')
  },
  {
    id: 't30',
    rule: 't',
    what: "a hostile scrollback arm dropped from the phone's attack",
    file: () => 'build/p316/hostile-door.mjs',
    edit: (src) => src.replace("'scrollback-404':", "'scrollback-410':")
  },
  {
    id: 'ab20',
    rule: 'ab',
    what: 'a keys body built outside signedPost',
    file: () => `${APP}/Screens/ScreenKeys.swift`,
    edit: (src) => `${src}\nlet p337Body = KeysBody(dialog: nil, keys: [], session: "s", turn: "t", write: "w")\n`
  },
  {
    id: 'ab21',
    rule: 'ab',
    what: 'the keys body loses its dialog',
    file: () => `${APP}/Door/DoorClient.swift`,
    edit: (src) => src.replace('struct KeysBody: Encodable, Sendable {\n    let dialog: String?\n', 'struct KeysBody: Encodable, Sendable {\n')
  },
  {
    id: 'ac20',
    rule: 'ac',
    what: 'End back in a bar at the bottom',
    file: () => `${APP}/Screens/EndBar.swift`,
    edit: (src) => src.replace('ToolbarItem(placement: .topBarTrailing)', 'ToolbarItem(placement: .bottomBar)')
  },
  {
    id: 'ac21',
    rule: 'ac',
    what: 'the bottom End bar’s identifier brought back',
    file: () => `${APP}/Screens/Identifiers.swift`,
    edit: (src) => src.replace('    static let sessionEnd = "session-end"', '    static let sessionEnd = "session-end"\n    static let sessionEndBar = "session-end-bar"')
  },
  {
    id: 'v20',
    rule: 'v',
    what: "the Screen's failure sentence optional",
    file: () => `${APP}/Screens/DoorWords.swift`,
    edit: (src) => src.replace('static func screenSentence(for failure: DoorFailure) -> String {', 'static func screenSentence(for failure: DoorFailure) -> String? {')
  },
  {
    id: 'v21',
    rule: 'v',
    what: "a keys write's done drawn as an empty line",
    file: () => `${APP}/Screens/DoorWords.swift`,
    edit: (src) => src.replace('guard answer.outcome != .done else { return Copy.replySent }', 'guard answer.outcome != .done else { return "" }')
  },
  {
    id: 't20',
    rule: 't',
    what: "the hostile door's stray-answer arm dropped",
    file: () => 'build/p316/hostile-door.mjs',
    edit: (src) => src.replace(/\n[ \t]*'screen-stray-answer': \{[^\n]*\},/, '')
  },
  {
    id: 't21',
    rule: 't',
    what: "a hostile keys arm that counts no POST",
    file: () => 'build/p316/hostile-door.mjs',
    edit: (src) => src.replace("'keys-404': { what: 'a 404 with no body to a keys write', ends: 'sentence', screen: true, keys: true, posts: 1,", "'keys-404': { what: 'a 404 with no body to a keys write', ends: 'sentence', screen: true, keys: true,")
  },
  {
    id: 'k20',
    rule: 'k',
    what: "a keys write's bytes summed with a trapping +",
    file: () => `${APP}/Screens/ScreenKeys.swift`,
    edit: (src) => src.replace('let total = DoorNumber.sum(bytes, next.textBytes)', 'let total = Optional(bytes + next.textBytes)')
  },
  // PHASE 333.1, A STRANGER'S FIRST RUN (build/p3331/SPEC.md §6.3): (av) the
  // site's three addresses, the camera after Scan code, the Allow line and the
  // Tortie marker, and the three rules it widened, (s), (v) and (b).
  {
    id: 'av1',
    rule: 'av',
    what: 'a fourth tortie.sh page',
    file: () => LINKS,
    edit: allOf(['    case home, privacy, support\n', '    case home, privacy, support, blog\n'], ['        case .support: URL(string: "https://tortie.sh/support")\n', '        case .support: URL(string: "https://tortie.sh/support")\n        case .blog: URL(string: "https://tortie.sh/blog")\n'])
  },
  {
    id: 'av1b',
    rule: 'av',
    what: 'the privacy page over http://',
    file: () => LINKS,
    edit: (src) => src.replace('"https://tortie.sh/privacy"', '"http://tortie.sh/privacy"')
  },
  {
    id: 'av1c',
    rule: 'av',
    what: 'a query on the privacy page',
    file: () => LINKS,
    edit: (src) => src.replace('"https://tortie.sh/privacy"', '"https://tortie.sh/privacy?ref=app"')
  },
  {
    id: 'av1d',
    rule: 'av',
    what: 'a fragment on the support page',
    file: () => LINKS,
    edit: (src) => src.replace('"https://tortie.sh/support"', '"https://tortie.sh/support#top"')
  },
  {
    id: 'av1e',
    rule: 'av',
    what: 'a host that merely starts with tortie.sh',
    file: () => LINKS,
    edit: (src) => src.replace('"https://tortie.sh/privacy"', '"https://tortie.sh.example.com/privacy"')
  },
  {
    id: 'av1f',
    rule: 'av',
    what: 'an address forced with !',
    file: () => LINKS,
    edit: (src) => src.replace('        case .home: URL(string: "https://tortie.sh")\n', '        case .home: URL(string: "https://tortie.sh")!\n')
  },
  {
    id: 'av2',
    rule: 'av',
    what: 'a second https:// literal, in a screen',
    file: () => `${APP}/Screens/SessionScreen.swift`,
    edit: append('extension SessionScreen {\n    static let p3331Site = "https://tortie.sh/sessions"\n}\n')
  },
  {
    id: 'av3',
    rule: 'av',
    what: 'the opener taking a String rather than a SiteLink',
    file: () => LINKS,
    edit: allOf(['    func open(_ link: SiteLink)\n}', '    func open(_ link: String)\n}'], ['struct SiteOpener: SiteOpening {\n    func open(_ link: SiteLink) {\n        guard let url = link.address, LinkPolicy.opens(url) else { return }', 'struct SiteOpener: SiteOpening {\n    func open(_ link: String) {\n        guard let url = URL(string: link), LinkPolicy.opens(url) else { return }'])
  },
  {
    id: 'av3b',
    rule: 'av',
    what: 'the opener no longer asking LinkPolicy.opens before its open',
    file: () => LINKS,
    edit: (src) => src.replace('        guard let url = link.address, LinkPolicy.opens(url) else { return }\n        UIApplication.shared.open(url)', '        guard let url = link.address else { return }\n        UIApplication.shared.open(url)')
  },
  {
    id: 'av3c',
    rule: 'av',
    what: 'a second opener: another type conforming to SiteOpening, in Settings',
    file: () => `${APP}/Screens/SettingsScreen.swift`,
    edit: append('struct P3331OtherOpener: SiteOpening {\n    func open(_ link: SiteLink) { }\n}\n')
  },
  {
    id: 'av4',
    rule: 'av',
    what: 'a third file naming SiteOpener',
    file: () => `${APP}/Screens/ListScreen.swift`,
    edit: append('extension ListScreen {\n    static let p3331Opener = SiteOpener()\n}\n')
  },
  {
    id: 'av5',
    rule: 'av',
    what: 'QRScanner( built outside the Scan code branch, so iOS asks for the camera at once',
    file: () => PAIRING_SCREEN,
    edit: (src) => src.replace('                    } else {\n                        steps\n                        scanButton\n                    }', '                    } else {\n                        scanner(QRScanner(active: false) { _ in })\n                        steps\n                        scanButton\n                    }')
  },
  {
    id: 'av5b',
    rule: 'av',
    what: 'the camera asked for by PairingModel itself',
    file: () => PAIRING_SCREEN,
    edit: (src) => src.replace('    func startScanning() {\n        scanning = true', '    func startScanning() {\n        AVCaptureDevice.requestAccess(for: .video) { _ in }\n        scanning = true')
  },
  {
    id: 'av5c',
    rule: 'av',
    what: 'scanning set true by Pair again too, so a second pairing opens the camera with no Scan code',
    file: () => PAIRING_SCREEN,
    edit: (src) => src.replace('    func pairAgain() {\n        spent = nil\n', '    func pairAgain() {\n        scanning = true\n        spent = nil\n')
  },
  {
    id: 'av5d',
    rule: 'av',
    what: 'startScanning() called from Get Tortie for Mac, so the camera opens with no Scan code',
    file: () => PAIRING_SCREEN,
    edit: (src) => src.replace('    func openMacSite() {\n        site.open(.home)\n', '    func openMacSite() {\n        model.startScanning()\n        site.open(.home)\n')
  },
  {
    id: 'av6',
    rule: 'av',
    what: '"beta" in a Copy.swift value',
    file: () => `${APP}/Style/Copy.swift`,
    edit: (src) => src.replace('    static let setupGetMac = "Get Tortie for Mac"', '    static let setupGetMac = "Get the Tortie for Mac beta"')
  },
  {
    id: 'av7',
    rule: 'av',
    what: 'the Allow line drawn under a time-out too',
    file: () => `${APP}/Screens/DoorWords.swift`,
    edit: (src) => src.replace('        if sentence == Copy.cannotReachMac {\n            return Copy.reachAllowAgain\n        }', '        if sentence == Copy.cannotReachMac || sentence == Copy.macDidNotAnswer {\n            return Copy.reachAllowAgain\n        }')
  },
  {
    id: 'av7b',
    rule: 'av',
    what: 'reachNote( asked by the list',
    file: () => `${APP}/Screens/ListScreen.swift`,
    edit: append('extension ListScreen {\n    static var p3331Note: String? { DoorWords.reachNote(for: Copy.cannotReachMac) }\n}\n')
  },
  {
    id: 'av8',
    rule: 'av',
    what: "the marker's guard taken out, so the version arms answer for {\"v\":1}",
    file: () => `${APP}/Door/Pairing.swift`,
    edit: (src) => src.replace('              let marker = try? JSONDecoder().decode(Marker.self, from: Data(payload.utf8)),\n              let fp = marker.fp, let markerPin = Base64URL.decode(fp), markerPin.count == 32,\n              marker.dk != nil, marker.dx != nil else {', '              let marker = try? JSONDecoder().decode(Marker.self, from: Data(payload.utf8)) else {')
  },
  {
    id: 'av8b',
    rule: 'av',
    what: 'the newer arm written as v == 4, so a v:5 code from a later Mac reads as not a Tortie code',
    file: () => `${APP}/Door/Pairing.swift`,
    edit: (src) => src.replace('if marker.v > version && marker.v <= 99 { throw PairingFailure.codeFromNewerMac }', 'if marker.v == 4 { throw PairingFailure.codeFromNewerMac }')
  },
  // (av9), the fix round: each site press drawn by its own words.
  {
    id: 'av9',
    rule: 'av',
    what: 'the pairing screen’s Privacy and Support actions swapped, so Privacy opens the support page (the 333.1 verifier’s M6, green in every gate before av9)',
    file: () => PAIRING_SCREEN,
    edit: allOf(['Button(action: openPrivacy)', 'Button(action: P3331SWAP)'], ['Button(action: openSupport)', 'Button(action: openPrivacy)'], ['Button(action: P3331SWAP)', 'Button(action: openSupport)'])
  },
  {
    id: 'b12',
    rule: 'b',
    what: 'the first step’s number handed to stepRow as a literal (the 333.1 verifier’s M19, green before the fix round taught (b) that stepRow draws it)',
    file: () => PAIRING_SCREEN,
    edit: (src) => src.replace('stepRow(placed.place, Copy.setupGetMac,', 'stepRow("1", Copy.setupGetMac,')
  },
  {
    id: 'av9b',
    rule: 'av',
    what: 'Settings’ Privacy press opening the support page',
    file: () => `${APP}/Screens/SettingsScreen.swift`,
    edit: (src) => src.replace('    func openPrivacy() {\n        site.open(.privacy)\n', '    func openPrivacy() {\n        site.open(.support)\n')
  },
  {
    id: 'av9c',
    rule: 'av',
    what: 'Settings’ Privacy row identified as Support',
    file: () => `${APP}/Screens/SettingsScreen.swift`,
    edit: (src) => src.replace('            .accessibilityIdentifier(ID.settingsPrivacy)\n', '            .accessibilityIdentifier(ID.settingsSupport)\n')
  },
  {
    id: 's12',
    rule: 's',
    what: 'the build left at 7 in one configuration (Debug), 337.1’s',
    file: () => PBX,
    edit: (src) => src.replace('CURRENT_PROJECT_VERSION = 8;', 'CURRENT_PROJECT_VERSION = 7;')
  },
  {
    id: 'v32',
    rule: 'v',
    what: 'the Allow line made non-optional, so every failure gets one',
    file: () => `${APP}/Screens/DoorWords.swift`,
    edit: (src) => src.replace('    static func reachNote(for sentence: String) -> String? {\n        if sentence == Copy.cannotReachMac {\n            return Copy.reachAllowAgain\n        }\n        return nil\n    }', '    static func reachNote(for sentence: String) -> String {\n        if sentence == Copy.cannotReachMac {\n            return Copy.reachAllowAgain\n        }\n        return Copy.reachAllowAgain\n    }')
  },
  {
    id: 'p22',
    rule: 'p',
    what: 'the marker decoding the pairing secret too',
    file: () => `${APP}/Door/Pairing.swift`,
    edit: (src) => src.replace('        let dx: String?\n    }\n', '        let dx: String?\n        let ps: String?\n    }\n')
  },
  {
    id: 'v31',
    rule: 'v',
    what: 'unsupportedCode put back with no sentence',
    file: () => `${APP}/Door/Pairing.swift`,
    edit: (src) => src.replace('    /// A code from an older Tortie for Mac.\n    case codeFromOlderMac\n', '    /// A code from an older Tortie for Mac.\n    case codeFromOlderMac\n    case unsupportedCode\n')
  }
];

// ---------------------------------------------------------------------------
// The clone
// ---------------------------------------------------------------------------

let scratch = null;
const cleanup = () => {
  if (scratch !== null) {
    rmSync(scratch, { recursive: true, force: true });
    scratch = null;
  }
};
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    cleanup();
    process.exit(1);
  });
}

/** A digest of every file under the working tree's ios/ plus tokens.css. */
function treeDigest() {
  const h = createHash('sha256');
  const walk = (dir) => {
    for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)) : []) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) h.update(relative(REPO, p)).update(readFileSync(p));
    }
  };
  walk(join(REPO, 'ios'));
  h.update(readFileSync(join(REPO, 'src', 'renderer', 'styles', 'tokens.css')));
  h.update(ICON_MASTER).update(readFileSync(join(REPO, ICON_MASTER)));
  return h.digest('hex');
}

function buildClone() {
  scratch = mkdtempSync('/private/tmp/p316-ablation-');
  const clone = (from, to) => {
    const r = spawnSync('cp', ['-Rc', from, to], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`cp -Rc ${relative(REPO, from)} failed: ${String(r.stderr).trim()}`);
  };
  for (const name of ['ios', 'src']) clone(join(REPO, name), join(scratch, name));
  // Rule (r) lays the brand master over its ground, so the clone holds it.
  mkdirSync(join(scratch, dirname(ICON_MASTER)), { recursive: true });
  clone(join(REPO, ICON_MASTER), join(scratch, ICON_MASTER));
  // build/, but never build/vendor/: whatever is vendored there is linked,
  // never copied, and no arm may plant under it (see run).
  spawnSync('mkdir', [join(scratch, 'build')]);
  for (const name of readdirSync(join(REPO, 'build'))) {
    if (name === 'vendor') continue;
    clone(join(REPO, 'build', name), join(scratch, 'build', name));
  }
  if (existsSync(join(REPO, 'build', 'vendor'))) symlinkSync(join(REPO, 'build', 'vendor'), join(scratch, 'build', 'vendor'));
  for (const name of readdirSync(REPO)) {
    if (name === 'package.json' || /^tsconfig.*\.json$/.test(name)) copyFileSync(join(REPO, name), join(scratch, name));
  }
  symlinkSync(join(REPO, 'node_modules'), join(scratch, 'node_modules'));
}

/** One run of the CLONE's own conformance:ios. */
function runGate() {
  const r = spawnSync(process.execPath, [join(scratch, 'build', 'conformance-ios.mjs'), '--json'], {
    cwd: scratch,
    encoding: 'utf8',
    timeout: 180_000
  });
  const line = String(r.stdout ?? '').split('\n').find((l) => l.startsWith('CONFORMANCE_IOS:'));
  if (line === undefined) return { ok: false, rules: null, why: `the gate printed no verdict (exit ${String(r.status)}): ${String(r.stderr ?? '').trim().slice(-300)}` };
  const parsed = JSON.parse(line.slice('CONFORMANCE_IOS:'.length));
  return { ok: true, rules: parsed.rules, scannerFixturesFailed: parsed.scannerFixturesFailed };
}

/** One arm's verdict, as a delta against the base. */
function judge(arm, base, got, relPath) {
  if (!got.ok) return { arm, verdict: 'FAIL', why: got.why };
  const wasGreen = base.rules[arm.rule]?.ok === true;
  const nowRed = got.rules[arm.rule]?.ok === false;
  const collateral = Object.entries(got.rules)
    .filter(([k, v]) => k !== arm.rule && !v.ok && base.rules[k]?.ok === true)
    .map(([k]) => k);
  if (wasGreen && nowRed) {
    return { arm, verdict: 'red', why: `(${arm.rule}) went red${collateral.length > 0 ? `; also red: ${collateral.join(', ')}` : ''}`, file: relPath };
  }
  return {
    arm,
    verdict: 'FAIL',
    why: !wasGreen ? `(${arm.rule}) was already red at the base, so this arm proves nothing` : `(${arm.rule}) stayed GREEN with the plant in ${relPath}: that clause of the rule is not asserted`,
    file: relPath
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const only = (process.env['P316_ONLY'] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
const arms = only.length === 0 ? ARMS : ARMS.filter((a) => only.includes(a.id));
const before = treeDigest();
let failed = 0;
const rows = [];
try {
  buildClone();
  const base = runGate();
  if (!base.ok) throw new Error(base.why);
  const baseRed = Object.entries(base.rules).filter(([, v]) => !v.ok).map(([k]) => k);
  say(`base: ${baseRed.length === 0 ? 'every rule green' : `red at the base: ${baseRed.join(', ')}`}${base.scannerFixturesFailed > 0 ? `; ${String(base.scannerFixturesFailed)} scanner fixture(s) failed` : ''}`);
  if (base.scannerFixturesFailed > 0) failed += 1;

  for (const arm of arms) {
    const relPath = arm.file(scratch);
    if (relPath === null) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: 'no file in the tree to plant into; the arm has lost its anchor' });
      continue;
    }
    const path = join(scratch, relPath);
    if (relPath === 'build/vendor' || relPath.startsWith('build/vendor/')) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: `${relPath} is under build/vendor/, which the clone LINKS to the working tree; no arm plants there` });
      continue;
    }
    if (arm.create === true) {
      if (existsSync(path)) {
        failed += 1;
        rows.push({ arm, verdict: 'FAIL', why: `${relPath} already exists, so planting it as a new file proves nothing` });
        continue;
      }
      // A new file under a folder the tree does not have (the Tailnet folder
      // Phase 330 deleted) makes that folder, and the folder goes with it.
      let made = dirname(path);
      while (!existsSync(dirname(made)) && dirname(made) !== made) made = dirname(made);
      const madeFolder = existsSync(dirname(path)) ? null : made;
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, arm.edit(''));
      let got;
      try {
        got = runGate();
      } finally {
        rmSync(path, { force: true });
        if (madeFolder !== null) rmSync(madeFolder, { recursive: true, force: true });
      }
      if (existsSync(path)) {
        failed += 1;
        rows.push({ arm, verdict: 'FAIL', why: `the planted ${relPath} was not removed from the clone` });
        continue;
      }
      rows.push(judge(arm, base, got, relPath));
      if (rows[rows.length - 1].verdict !== 'red') failed += 1;
      continue;
    }
    if (!existsSync(path)) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: `${relPath} does not exist; the arm has lost its anchor` });
      continue;
    }
    const original = readFileSync(path);
    // A `bytes` arm edits the file's bytes (a PNG); every other arm its text.
    const edited = arm.remove === true ? null : arm.bytes === true ? arm.edit(original) : arm.edit(original.toString('utf8'));
    if (arm.bytes === true ? edited !== null && Buffer.compare(edited, original) === 0 : edited === original.toString('utf8')) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: `the edit changed nothing in ${relPath}; its anchor is gone, so this rule is no longer proved` });
      continue;
    }
    if (edited === null) rmSync(path);
    else writeFileSync(path, edited);
    let got;
    try {
      got = runGate();
    } finally {
      writeFileSync(path, original);
    }
    const back = sha(readFileSync(path));
    const worktree = existsSync(join(REPO, relPath)) ? sha(readFileSync(join(REPO, relPath))) : null;
    if (back !== sha(original) || (worktree !== null && worktree !== back)) {
      failed += 1;
      rows.push({ arm, verdict: 'FAIL', why: `${relPath} was not put back byte for byte in the clone` });
      continue;
    }
    rows.push(judge(arm, base, got, relPath));
    if (rows[rows.length - 1].verdict !== 'red') failed += 1;
  }
} catch (err) {
  failed += 1;
  say(`the run threw: ${String(err?.message ?? err)}`);
} finally {
  cleanup();
}

for (const row of rows) {
  process.stdout.write(`${row.verdict === 'red' ? 'ok  ' : 'FAIL'} ${row.arm.id.padEnd(3)} (${row.arm.rule}) ${row.arm.what}: ${row.why}\n`);
}
const after = treeDigest();
if (after !== before) {
  failed += 1;
  say('THE WORKING TREE MOVED during the run. This script never writes there, so another builder did, and these readings are of a moving tree; run it again.');
}
const rulesProved = new Set(rows.filter((r) => r.verdict === 'red').map((r) => r.arm.rule));
if (only.length === 0) {
  for (const rule of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj', 'ak', 'al', 'am', 'an', 'ao', 'ap', 'aq', 'ar', 'as', 'at', 'au', 'av']) {
    if (!rulesProved.has(rule)) {
      failed += 1;
      say(`rule (${rule}) has no arm that turned it red, so nothing here proves it can fail`);
    }
  }
}
if (failed > 0) {
  say(`FAIL: ${String(failed)} problem(s). ${String(rows.filter((r) => r.verdict === 'red').length)} of ${String(arms.length)} arms red on their own rule.`);
  process.exit(1);
}
say(
  `PASS: ${String(arms.length)} of ${String(arms.length)} arms red on the rule that owns them, ` +
    `${only.length === 0 ? 'every rule (a) to (z) and (aa) to (av) proved able to fail' : 'the named arms only (a full run is what proves every rule)'}, the clone removed, the working tree unmoved.`
);
