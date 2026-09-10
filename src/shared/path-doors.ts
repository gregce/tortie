/**
 * WHICH DOOR A PATH TAKES, and the sequence that decides it (Phase 247).
 *
 * A path an agent printed into a transcript is text somebody else wrote. This
 * module is the one place that decides what a click on such a text may reach,
 * and it is split in two on purpose: everything here is PURE, and the
 * filesystem half lives in `src/main/fs/path-door.ts`, which is the only
 * caller that turns a spelling into the facts below.
 *
 * ## The three doors, and the operator's decision of 2026-09-09
 *
 * Research 107 refusal 1 read "a click never runs anything", and the operator
 * lifted it narrowly: **Tortie first, Preview as the fallback**. So
 *
 *   - Tortie draws it        -> an editor tab, or the image surface;
 *   - a NAMED, CLOSED SET    -> `shell.openPath`, and the Mac draws it;
 *   - everything else        -> NOT UNDERLINED AT ALL.
 *
 * A link that does nothing is worse than no link, so a refusal here is a span
 * that is never offered rather than a span that is offered and then complains.
 *
 * ## Why the external set is an ALLOWLIST and can never become a denylist
 *
 * `shell.openPath` hands a string to LaunchServices, which picks a program by
 * extension and RUNS it. A `.command`, a `.app`, a `.scpt` or a `.webloc` on
 * one line of agent output would be one click from executing. A denylist of
 * dangerous extensions is refused outright by this phase's charter: the set is
 * spelled as `EXTERNAL_ALLOW` below or the external door does not ship.
 *
 * ## Why `.pdf` is the whole set, and that it is a JUDGEMENT
 *
 * Research 111 section 3 counted every path-shaped token in a 52,094-row
 * corpus of the operator's own sessions: zero `.pdf`, zero `.docx`, zero
 * `.zip`, zero `.csv`, zero `.mov`, zero `.command`, zero `.app`. Every one of
 * the 200 spans that reached a door was a kind Tortie draws itself. So the
 * allowlist DERIVED from the corpus is empty, and `.pdf` is here because it is
 * the kind he asked for after `.png` and because it is the one common document
 * kind Tortie has DELIBERATELY DEFERRED rather than never considered
 * (`PREVIEWABLE_EXTENSIONS` in ./preview-types.ts names PDF in its own
 * comment). The door is a stand-in for a surface that is expected to exist one
 * day, and it closes again in one line when it does.
 *
 * ## MODE IS ASKED BEFORE EXTENSION, and that order is the rule
 *
 * A `.pdf` carrying the executable bit would otherwise walk straight through
 * the allowlist. `decidePathDoor` asks the executable bit before it reads an
 * extension, and the two are separate questions with separate refusal words.
 */

import { extensionOf, isImagePath } from './image-types';
import { looksLikeSecretPath } from './preview-types';

/** The three destinations. `null` is the third door: nothing at all. */
export type PathDoor = 'editor' | 'image' | 'mac';

/**
 * Why a path is not offered. One word per clause, so a refusal can be counted
 * and named rather than reported as a boolean.
 */
export type PathDoorRefusal =
  | 'not-absolute'
  | 'control-character'
  | 'mount'
  | 'missing'
  | 'bundle'
  | 'not-a-regular-file'
  | 'secret-name'
  | 'executable-bit'
  // PHASE 250, and both belong to a spelling that was RELATIVE.
  | 'outside-base'
  | 'relative-external';

/**
 * The answer. `door: null` means the span is never underlined and a click on
 * it never happens, so the refusal word exists for gates and probes and is
 * never shown to a person.
 */
export type PathDoorAnswer =
  | { door: PathDoor; path: string }
  | { door: null; refusal: PathDoorRefusal };

/**
 * What the filesystem said, all of it about the REALPATH (research 107
 * refusal 10). `stat` follows a link and comparing spellings does not mean
 * what it says, so a symlink spelled `.md` whose leaf is a `.pem` is a `.pem`
 * here, and a symlink spelled `.png` whose leaf is an `.app` is a bundle.
 */
export interface PathFacts {
  /** The spelling the span named, after decoration was stripped. */
  spelling: string;
  /** The resolved path, or null when nothing is there. */
  realPath: string | null;
  /** The kind of the REALPATH's target. */
  kind: 'file' | 'dir' | 'other' | 'missing';
  /** True when the realpath is a macOS bundle directory. */
  bundle: boolean;
  /** True when `st.mode & 0o111` is non-zero on the REALPATH. */
  executable: boolean;
  /**
   * PHASE 250. The absolute base a RELATIVE spelling was joined to, or `null`
   * for a spelling that was already absolute.
   *
   * It is the ONE thing the sequence learns about how a spelling was made, and
   * it buys exactly two clauses below: containment, and the refusal to hand a
   * resolved spelling to macOS. Everything else is asked of the realpath
   * without knowing or caring — a base is not a bypass.
   */
  resolvedFrom: string | null;
}

/**
 * Mounts refused, and WHAT THAT DOES AND DOES NOT BUY (corrected by the
 * Phase 247 fix round).
 *
 * A stale automount answers a metadata call by blocking the thread that made
 * it, and this sequence runs on a POINTER MOVING over a pane. Research 111
 * counted 0 of these in a 52,094-row corpus, so the refusal costs nothing
 * measured.
 *
 * **IT DOES NOT REMOVE THE SHAPE THAT COULD BLOCK A HOVER, and the version of
 * this comment that said so was wrong.** It is asked of the SPELLING, and a
 * symlink at an ordinary name whose leaf sits on a stale automount is followed
 * by `realpath` in src/main/fs/path-door.ts before anything here has seen the
 * mount at all. So it is asked a SECOND time below, of the REALPATH, which
 * closes the DECISION half — a link into `/Volumes` is refused exactly as a
 * spelling in `/Volumes` is — and closes none of the blocking half. The
 * residual limit is stated in that module's header: those calls run on the
 * libuv threadpool rather than on main, so what a stale automount costs is a
 * pool thread and not the app, and there is no timeout to give them.
 *
 * It is NOT a denylist of dangerous kinds — those are refused by the sequence
 * below, by mode and by the closed allowlist. It is a question about a
 * SPELLING, which is why it lives here beside the other spelling rules rather
 * than in main.
 */
const MOUNT_REFUSED = [/^\/Volumes\//, /^\/net\//];

/** True when a spelling names a mount that must never be asked about. */
export function onRefusedMount(spelling: string): boolean {
  return MOUNT_REFUSED.some((r) => r.test(spelling));
}

/**
 * COULD THIS SPELLING EVER BE ABSOLUTE? (Phase 247 fix round.)
 *
 * The renderer asks main about every span the grammar yields, and main answers
 * `not-absolute` for most of them: measured over the operator's own 25 live
 * panes and 56,977 rows, the grammar yields **7,172 spans over 1,552 distinct
 * targets, and 1,144 of those targets — 74% — are relative**. Each was a
 * cached entry and an IPC round trip for an answer that is a property of the
 * spelling.
 *
 * So the renderer refuses them itself, and this is the ONE spelling of that
 * rule so the two halves cannot drift. It is deliberately WIDER than the
 * clause it saves a trip to: `~foo/bar` is not expanded by `expandHome` and is
 * refused by main, and this says `true` for it, because a renderer rule that
 * is NARROWER than main's would drop links in silence while a wider one only
 * costs a round trip. `conformance:pathdoors` rule 12 drives that direction
 * over a fixture list rather than asserting it.
 */
export function couldBeAbsolute(spelling: string): boolean {
  return spelling.startsWith('/') || spelling.startsWith('~');
}

/**
 * IS THIS A BASE A RELATIVE SPELLING MAY BE JOINED TO? (Phase 250.)
 *
 * Absolute, more than the filesystem root, and free of control characters. The
 * root is refused because a base of `/` contains everything, which would make
 * the containment clause below say nothing at all, and because a project whose
 * path is `/` is not a project.
 */
export function usableBase(base: string): boolean {
  return base.startsWith('/') && base.length > 1 && !hasControlCharacter(base);
}

/**
 * IS THIS REALPATH STILL INSIDE THE BASE IT WAS JOINED TO? (Phase 250.)
 *
 * Asked of the REALPATH and never of the join, so a `..` climb and a symlink
 * that leaves the tree are one clause rather than two. `resolve` has already
 * normalised the `..`s away by the time this is asked, so what is left is a
 * plain prefix question — with the separator, because `/a/bc` is not inside
 * `/a/b`.
 *
 * **IT IS A PRECISION RULE AND NOT A SECURITY BOUNDARY, and saying so is the
 * honest thing.** A renderer that can send a base can equally send the joined
 * absolute path itself, and every check beneath is unchanged either way. What
 * this buys is that a relative path an agent printed opens a file in the tree
 * the agent was talking about, or opens nothing: research 114 section 4.6
 * priced it at 7 of 1,224 links over the operator's own panes.
 */
export function insideBase(real: string, base: string): boolean {
  if (!usableBase(base)) return false;
  const root = base.endsWith('/') ? base.slice(0, -1) : base;
  return real === root || real.startsWith(`${root}/`);
}

/**
 * WHAT THE RENDERER MAY SKIP THE ROUND TRIP FOR (Phase 250).
 *
 * Phase 247's `couldBeAbsolute` was the whole of this rule, because a relative
 * spelling could only ever answer `not-absolute`. With a base it can answer a
 * door, so the cheap refusal narrows to what it was really for: a spelling
 * that can never reach a door NO MATTER WHAT, which now means a relative
 * spelling on a pane with no usable base at all.
 *
 * It stays deliberately WIDER than main's answer, which is the direction that
 * can only cost a round trip and never an answer; `conformance:pathdoors`
 * rule 12 drives that direction over a fixture list rather than asserting it.
 */
export function couldBeAsked(spelling: string, base: string): boolean {
  return couldBeAbsolute(spelling) || usableBase(base);
}

/**
 * The closed set of kinds that may leave Tortie. See the header: this is an
 * allowlist and it may never be inverted into a denylist.
 */
export const EXTERNAL_ALLOW: ReadonlySet<string> = new Set(['.pdf']);

/**
 * True when a spelling holds a character that must never reach a door.
 *
 * Research 111's measurement asked this of CR and LF, which is what a
 * filename can really carry on macOS and what the newline rescue in
 * src/main/drop/prepare.ts exists for. This asks it of every C0 control and
 * DEL, which is a superset: it refuses everything the measurement refused and
 * additionally refuses a NUL or an escape somebody spelled into a name.
 */
export function hasControlCharacter(spelling: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u001f\u007f]/.test(spelling);
}

/**
 * THE SEQUENCE, in the order research 111 section 5.4 measured and this phase
 * ships.
 *
 * Steps 3 and 4 overlap on purpose. A bundle IS a directory, so the
 * regular-file test refuses every bundle whatever its suffix claims; the named
 * bundle check exists so the refusal WORD is accurate and so a later round
 * cannot delete the regular-file test believing the bundle check covers it.
 * Main's own `isAppBundleOnDisk` tests `.app` and a directory and would not
 * catch a bundle wearing a `.png` suffix — the regular-file test is what
 * catches that, and it is the reason a `.app` never reaches a door.
 */
export function decidePathDoor(facts: PathFacts): PathDoorAnswer {
  // 1. the spelling, before any filesystem call was made
  if (!facts.spelling.startsWith('/')) {
    return { door: null, refusal: 'not-absolute' };
  }
  if (hasControlCharacter(facts.spelling)) {
    return { door: null, refusal: 'control-character' };
  }
  if (onRefusedMount(facts.spelling)) {
    return { door: null, refusal: 'mount' };
  }
  // 2. the realpath — everything below is asked of it, leaf included
  const real = facts.realPath;
  // ...INCLUDING THE MOUNT, which the spelling clause above cannot see: a
  // symlink at an ordinary name is what carries a path onto a mount without
  // ever spelling one. The word stays `mount` rather than becoming `missing`,
  // because a refusal in this domain says which clause refused.
  if (real !== null && onRefusedMount(real)) {
    return { door: null, refusal: 'mount' };
  }
  if (real === null || facts.kind === 'missing') {
    return { door: null, refusal: 'missing' };
  }
  // 2b. PHASE 250. A spelling that was RELATIVE must still land inside the
  //     base it was joined to, asked of the REALPATH so a `..` climb and a
  //     symlink out of the tree are one clause. It is asked HERE, before the
  //     kind and the name, because where a resolved spelling came from is a
  //     question about the join rather than about the file: a path outside
  //     the base is refused as such whatever happens to be sitting there.
  if (facts.resolvedFrom !== null && !insideBase(real, facts.resolvedFrom)) {
    return { door: null, refusal: 'outside-base' };
  }
  // 3. the bundle, named so the refusal word is true
  if (facts.bundle) return { door: null, refusal: 'bundle' };
  // 4. a regular file — refuses a directory, a FIFO, a device, a socket
  if (facts.kind !== 'file') {
    return { door: null, refusal: 'not-a-regular-file' };
  }
  // 5. the name, through the shipped predicate
  if (looksLikeSecretPath(real)) {
    return { door: null, refusal: 'secret-name' };
  }
  // 6. the MODE, and it is asked BEFORE the extension
  if (facts.executable) return { door: null, refusal: 'executable-bit' };
  // 7. the extension, and only now
  if (isImagePath(real)) return { door: 'image', path: real };
  if (EXTERNAL_ALLOW.has(extensionOf(real))) {
    // 8. PHASE 250, and the asymmetry is the whole reason this phase's risk
    //    sits where it does. Opening the WRONG file in an editor tab is a
    //    surprise a person sees and closes; handing the wrong file to
    //    LaunchServices runs a program. A resolved relative spelling carries
    //    a base that research 114 section 4.3 measured right 84.6% of the
    //    time, so it may take a Tortie door and never the Mac one. It costs
    //    zero measured spans — no relative resolution in 59,791 rows reaches
    //    this clause, because `EXTERNAL_ALLOW` is `{.pdf}` and there is no
    //    `.pdf` in that corpus — and it is here so it stays that way.
    if (facts.resolvedFrom !== null) {
      return { door: null, refusal: 'relative-external' };
    }
    return { door: 'mac', path: real };
  }
  return { door: 'editor', path: real };
}
