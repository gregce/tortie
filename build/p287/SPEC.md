# Phase 287 — a credential too long for one `security` line

**Subject.** `fix(credentials): a credential too long for one security line`
**First body line.** `Phase 287: a credential too long for one security line`
**Semver.** Patch. **Tier 3**: it writes the person's credential store, and it closes two paths where a
switch loses something — one that destroys the person's own sign in (section 0, finding 3) and one that
refuses a switch for ever although nothing needs writing (finding 6).

**The choice is fixed: candidate (a), keep the refusal and say it.** The operator has not ruled on (b) or
(c). A credential whose `security -i` line would pass the measured buffer is refused before any spawn, as
today, and the person is told in a fixed sentence instead of reading an ordinary failed stage. The cap
compares BYTES. No payload ever goes on a command line. Nothing under the cap changes.

**This is the second pass.** The attacker returned `needs_work` with eleven problems; section 9 answers
every one and names where this spec changed for it. The attacker also re-measured the buffer with three
line shapes this spec writer did not use and agreed with section 1 exactly, so no number here moved.

**Independent methods the verifiers owe** (CLAUDE.md, "THE GOVERNING RULE"): re-derive the buffer on
their own scratch keychain with a different line shape again; attack every path to `security -i` with
hostile sizes and paths (section 4.3); measure the parent build with the extended app run (section 5.3);
drive L2, L3 and L6 over a real `security` on a scratch keychain; and read the real sizes (section 0,
finding 4).

---

## 0. What this spec found that the entry did not know

1. **The intact buffer is 4,096 bytes, newline included, not 4,097.** Phase 281.1's "a 4,097 byte line
   writes" was a line that had already been cut: its last byte, the closing quote of the keychain path,
   was split off and ran as a second command, which printed `security`'s usage, while the tokenizer
   accepted the unterminated quote and the write still landed. A 4,097 byte line ending in a harmless
   space prints nothing. Section 1 has every run.
2. **The observe carries no reason to any surface today.** A refused keep becomes a `KeepEvent` whose
   sentence is logged as `{provider, kind}` only (`src/main/logins/ipc.ts:199-201`); `LoginRow` has no
   field for it. And a refused choose is drawn nowhere a person looks. The only product choose is the
   meter card's native popup (`src/renderer/app/UsageMeter.tsx:528`); Settings has no choose at all
   (`src/renderer/settings/UsageGroup.tsx:256-260` offers remove and load only) and is a separate
   renderer with its own copy of the store (`src/renderer/state/logins.ts:6-8`), so its `problem` line
   (`UsageGroup.tsx:311-326`) never sees a refusal made from the card. In the main window
   `useLogins.problem` is drawn only by the Add login dialog (`src/renderer/app/AddLoginModal.tsx:53`,
   `:142-143`, `error ?? problem`), which does not clear it when it opens, so today a refused switch
   says nothing at the moment and turns up later under that dialog's name field. (Corrected by the
   attack, section 9, problem 4.)
3. **A default lift over an over-cap default store DESTROYS the person's own sign in today.** Measured
   through the shipping domain at `a4f44588` with the Phase 281 first-match fake (no process, no
   keychain): the default Claude item held a 2,179 byte credential (vault stage line 4,456 bytes), a
   default session was live, a kept 101 byte login was chosen. The observe logged
   `refused, Default, "Nothing could be written, so nothing changed."`, the activation answered
   `{"ok":true,"wrote":true,"says":"work is signed in again."}`, and afterwards
   `BIG still anywhere in the keychain: false`. `liftStore` ignores a refused capture for the default
   store (`src/main/credentials/keep.ts:1313` guards `store.id !== null` only), promotes the stale slot
   record if there is one, and writes over the one copy. `defaultStoreTarget`'s comment
   (`src/main/credentials/stores.ts`, "The observe that runs before any activate has already kept and
   promoted whatever account was there, so nothing is lost by writing it") is false exactly when the
   keep was refused. The driver is `<scratch>/lift-loss.mts` (section 1 names `<scratch>`), run from the
   worktree with `node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.node.json <driver>`; its second
   scenario is section 3's L2, and `<scratch>/bytes-hole-100.mts` is finding 5.
4. **Codex is over the cap on this Mac, and the entry's "under a quarter of the cap" is wrong for it.**
   `stat` only, the file was not read: `~/.codex/auth.json` is **4,193 bytes**, mode 600
   (`~/.claude/.credentials.json` is absent; Claude lives in the keychain). Its vault stage line would be
   107 + 2 × 4,193 = 8,493 bytes. Tortie's own vault is the keychain on macOS for BOTH providers
   (`src/main/credentials/index.ts`, `defaultVault`), so today every observe of a signed in codex store
   on macOS refuses the keep, silently, and no codex account has ever been kept here. A codex switch never
   writes (nothing is kept, so `activateLogin` answers "Tortie has no kept sign in for this one." at
   `keep.ts:1018-1026`) and so never meets the refusal. This phase does not change that outcome, and
   after the attack it does not draw it either: the row's label is drawn only where it changes what a
   switch does (section 2.3), and no codex row on this Mac is such a row. The data carries
   `tooLarge: true`; the fix is the file vault the operator is asked about (section 10).
5. **At the parent the harness runner sends a line over the buffer.** A `/bin/sh` stand-in for
   `security` that records its stdin, driven through the shipping `defaultSecurityRunner` with a scratch
   keychain path of 100 accented letters: `suffixed line: 4000 UTF-16 units, 4100 bytes; cap 4000` and
   `runner answered {"code":0,"stdout":""}; the program was SPAWNED and read 4100 bytes`. With 60
   letters it sent 4,060 bytes. Section 1 shows 4,098 bytes and above hang the real program.
6. **A login that GREW past the cap can never be chosen again, and the row promises that it can.**
   Measured by this spec writer's second pass through the shipping domain at `a4f44588` with the same
   first-match fake (no process, no keychain), `<scratch>/l6.mts`: a login kept while small (101 byte
   credential, 292 byte stage line) whose own store then holds 2,158 bytes for the SAME address
   (4,406 byte stage line against the 4,000 cap). The observe answers
   `refused, work, "Nothing could be written, so nothing changed."` and the row reads
   `{"kept":true,"restores":true,"email":"work@example.com"}`, so the menu draws "Puts this account
   back."; the click answers
   `{"ok":false,"reason":"Tortie could not keep the sign in that is there, so nothing was written over
   it."}` with a default session live and again with none; every keychain row is byte identical before and
   after; and `file.chosen` is still `{}`, so the choice is not even recorded. **The account was provably
   the same in that run**: no login was minted and no promotion event was pushed, which is
   `captureReading`'s own proof (`keep.ts:487`) that `sameAccountProven` held. This is the attack's
   problem 2 and section 3's L6, and it is the second loss this phase closes: nothing needs writing
   there, and refusing it protects no byte.

---

## 1. The measurement

**Conditions.** macOS 15.7.9 (24G830), `/usr/bin/security` from `Security-61439.140.12.706.1` (`what`).
Apple's SecurityTool source is not on this Mac (`mdfind -name SecurityTool` and a search for `security.c`
found nothing), so nothing was downloaded and the edges below are measured, not read. Every `security`
call ran with `HOME` set to a scratch directory made by the script. Every call that could reach an item
named the scratch keychain by its full path, and the only calls without one were `default-keychain` and
`list-keychains`, which read that scratch `HOME`'s own settings. No write ran before `security
default-keychain` under that `HOME` answered "could not be found". The
keychain and the whole scratch tree were removed in a `trap`. Every `security -i` ran in the background
and was polled for 2.5 s; one still alive was sent SIGTERM (SIGKILL after 1 s, never needed). The script
is `<scratch>/measure.sh`, where `<scratch>` is this session's scratchpad `p287/spec`; that prefix is the
only substitution in the output below. The operator's `~/Library/Preferences/com.apple.security.plist`
did not exist before the runs and did not exist after them.

**The line**, exactly the shape `defaultSecurityRunner` sends with a keychain file:
`add-generic-password -U -a "<acct>" -s "<svc>" -X "<hex>" "<keychain path>"\n`, the keychain path LAST,
an ASCII payload of `x` bytes. `L` is the whole line in bytes, newline included, checked with `wc -c` on
the file handed to stdin; `characters` is `wc -m` under `en_US.UTF-8`.

### 1.1 Run 1, ASCII path (125 bytes, 125 characters)

```
mode=ascii scratch HOME=<scratch>/run-O8Ph7F/home
keychain=<scratch>/run-O8Ph7F/kc/k.keychain-db
keychain path: 125 bytes, 125 characters
before any write, default-keychain: security: SecKeychainCopyDefault: A default keychain could not be found.
search list before:     "/Library/Keychains/System.keychain"
create-keychain exit 0
search list after create:     "/Library/Keychains/System.keychain"
default-keychain after create: security: SecKeychainCopyDefault: A default keychain could not be found.
L=200 bytes (200 characters, file 200 bytes) payload=4 acct=p287-ax: -i exit 0 in 0.12 s; output: ; read-back exit 0: byte for byte (4 bytes); other files beside the keychain: [.fl3DB3D192 ]
L=4090 bytes (4090 characters, file 4090 bytes) payload=1949 acct=p287-a: -i exit 0 in 0.12 s; output: ; read-back exit 0: byte for byte (1949 bytes); other files beside the keychain: [.fl3DB3D192 ]
L=4096 bytes (4096 characters, file 4096 bytes) payload=1952 acct=p287-a: -i exit 0 in 0.12 s; output: ; read-back exit 0: byte for byte (1952 bytes); other files beside the keychain: [.fl3DB3D192 ]
L=4097 bytes (4097 characters, file 4097 bytes) payload=1952 acct=p287-ax: -i exit 0 in 0.12 s; output:     help                                 Show all commands, or show usage for a command.|    list-keychains                       Display or manipulate the keychain search list.|    list-smartcards   ; read-back exit 0: byte for byte (1952 bytes); other files beside the keychain: [.fl3DB3D192 ]
L=4098 bytes (4098 characters, file 4098 bytes) payload=1953 acct=p287-a: -i hung (state S after 2.5 s, ended by SIGTERM) in 2.70 s; output: ; read-back exit 44: security: SecKeychainSearchCopyNext: The specified item could not be found in the keychain. ; other files beside the keychain: [.fl3DB3D192 ]
search list at end:     "/Library/Keychains/System.keychain"
default-keychain at end: security: SecKeychainCopyDefault: A default keychain could not be found.
scratch HOME tree: .
trap: delete-keychain exit 0
trap: scratch removed (gone)
```

### 1.2 Run 2, ASCII path, the edge from both sides

```
mode=ascii scratch HOME=<scratch>/run-MCheHR/home
keychain=<scratch>/run-MCheHR/kc/k.keychain-db
keychain path: 125 bytes, 125 characters
before any write, default-keychain: security: SecKeychainCopyDefault: A default keychain could not be found.
search list before:     "/Library/Keychains/System.keychain"
create-keychain exit 0
search list after create:     "/Library/Keychains/System.keychain"
default-keychain after create: security: SecKeychainCopyDefault: A default keychain could not be found.
L=4094 bytes (4094 characters, file 4094 bytes) payload=1951 acct=p287-a: -i exit 0 in 0.11 s; output: ; read-back exit 0: byte for byte (1951 bytes); other files beside the keychain: [.fl3DB3D192 ]
L=4095 bytes (4095 characters, file 4095 bytes) payload=1951 acct=p287-ax: -i exit 0 in 0.12 s; output: ; read-back exit 0: byte for byte (1951 bytes); other files beside the keychain: [.fl3DB3D192 ]
L=4096 bytes (4096 characters, file 4096 bytes) payload=1952 acct=p287-a: -i exit 0 in 0.11 s; output: ; read-back exit 0: byte for byte (1952 bytes); other files beside the keychain: [.fl3DB3D192 ]
L=4097 bytes (4097 characters, file 4097 bytes) payload=1952 acct=p287-ax: -i exit 0 in 0.11 s; output:     help                                 Show all commands, or show usage for a command.|    list-keychains                       Display or manipulate the keychain search list.|    list-smartcards   ; read-back exit 0: byte for byte (1952 bytes); other files beside the keychain: [.fl3DB3D192 ]
L=4099 bytes (4099 characters, file 4099 bytes) payload=1953 acct=p287-ax: -i hung (state S after 2.5 s, ended by SIGTERM) in 2.70 s; output: ; read-back exit 44: security: SecKeychainSearchCopyNext: The specified item could not be found in the keychain. ; other files beside the keychain: [.fl3DB3D192 ]
L=4100 bytes (4100 characters, file 4100 bytes) payload=1954 acct=p287-a: -i hung (state S after 2.5 s, ended by SIGTERM) in 2.70 s; output: ; read-back exit 44: security: SecKeychainSearchCopyNext: The specified item could not be found in the keychain. ; other files beside the keychain: [.fl3DB3D192 ]
L=4110 bytes (4110 characters, file 4110 bytes) payload=1959 acct=p287-a: -i hung (state S after 2.5 s, ended by SIGTERM) in 2.70 s; output: ; read-back exit 44: security: SecKeychainSearchCopyNext: The specified item could not be found in the keychain. ; other files beside the keychain: [.fl3DB3D192 ]
search list at end:     "/Library/Keychains/System.keychain"
default-keychain at end: security: SecKeychainCopyDefault: A default keychain could not be found.
scratch HOME tree: .
trap: delete-keychain exit 0
trap: scratch removed (gone)
```

### 1.3 Run 3, a multi-byte keychain path (146 bytes, 136 characters): the buffer counts BYTES

The scratch directory is `kc-éàüöçñéàüö`, ten NFC letters of two bytes each, so every line below has ten
more bytes than characters.

```
mode=multibyte scratch HOME=<scratch>/run-bPK2LO/home
keychain=<scratch>/run-bPK2LO/kc-éàüöçñéàüö/k.keychain-db
keychain path: 146 bytes, 136 characters
before any write, default-keychain: security: SecKeychainCopyDefault: A default keychain could not be found.
search list before:     "/Library/Keychains/System.keychain"
create-keychain exit 0
search list after create:     "/Library/Keychains/System.keychain"
default-keychain after create: security: SecKeychainCopyDefault: A default keychain could not be found.
L=4090 bytes (4080 characters, file 4090 bytes) payload=1936 acct=p287-ax: -i exit 0 in 0.12 s; output: ; read-back exit 0: byte for byte (1936 bytes); other files beside the keychain: [.fl3DB3D192 ]
L=4096 bytes (4086 characters, file 4096 bytes) payload=1939 acct=p287-ax: -i exit 0 in 0.12 s; output: ; read-back exit 0: byte for byte (1939 bytes); other files beside the keychain: [.fl3DB3D192 ]
L=4097 bytes (4087 characters, file 4097 bytes) payload=1940 acct=p287-a: -i exit 0 in 0.12 s; output:     help                                 Show all commands, or show usage for a command.|    list-keychains                       Display or manipulate the keychain search list.|    list-smartcards   ; read-back exit 0: byte for byte (1940 bytes); other files beside the keychain: [.fl3DB3D192 ]
L=4098 bytes (4088 characters, file 4098 bytes) payload=1940 acct=p287-ax: -i hung (state R after 2.5 s, ended by SIGTERM) in 2.75 s; output: ; read-back exit 44: security: SecKeychainSearchCopyNext: The specified item could not be found in the keychain. ; other files beside the keychain: [.fl3DB3D192 ]
L=4106 bytes (4096 characters, file 4106 bytes) payload=1944 acct=p287-ax: -i hung (state S after 2.5 s, ended by SIGTERM) in 2.85 s; output: ; read-back exit 44: security: SecKeychainSearchCopyNext: The specified item could not be found in the keychain. ; other files beside the keychain: [.fl3DB3D192 ]
search list at end:     "/Library/Keychains/System.keychain"
default-keychain at end: security: SecKeychainCopyDefault: A default keychain could not be found.
scratch HOME tree: .
trap: delete-keychain exit 0
trap: scratch removed (gone)
```

A 4,098 byte line of 4,088 characters hangs, and a 4,106 byte line of exactly 4,096 characters hangs,
while the 4,096 byte ASCII line of 4,096 characters wrote. So the edge is at a byte count and not at a
character count.

### 1.4 Run 4, the same edge with a trailing space after the path

`measure-space.sh` is the same script with the suffix `" "<path>" ` (one space before the newline).

```
mode=ascii scratch HOME=<scratch>/run-MqKdsH/home
keychain=<scratch>/run-MqKdsH/kc/k.keychain-db
keychain path: 125 bytes, 125 characters
before any write, default-keychain: security: SecKeychainCopyDefault: A default keychain could not be found.
search list before:     "/Library/Keychains/System.keychain"
create-keychain exit 0
search list after create:     "/Library/Keychains/System.keychain"
default-keychain after create: security: SecKeychainCopyDefault: A default keychain could not be found.
L=4096 bytes (4096 characters, file 4096 bytes) payload=1951 acct=p287-ax: -i exit 0 in 0.11 s; output: ; read-back exit 0: byte for byte (1951 bytes); other files beside the keychain: [.fl3DB3D192 ]
L=4097 bytes (4097 characters, file 4097 bytes) payload=1952 acct=p287-a: -i exit 0 in 0.11 s; output: ; read-back exit 0: byte for byte (1952 bytes); other files beside the keychain: [.fl3DB3D192 ]
search list at end:     "/Library/Keychains/System.keychain"
default-keychain at end: security: SecKeychainCopyDefault: A default keychain could not be found.
scratch HOME tree: .
trap: delete-keychain exit 0
trap: scratch removed (gone)
```

### 1.5 What the four runs mean

- **`security -i` takes at most 4,095 bytes of command per read.** A line of 4,096 bytes with its
  newline arrives whole (no output). At 4,097 bytes the last byte before the newline is split off and
  read as a second command: with the closing quote there, the orphan `"` is a command and `security`
  prints its usage (runs 1, 2, 3); with a space there, the orphan is blank and nothing is printed
  (run 4). The first half still writes because the tokenizer accepts an unterminated trailing quote. At
  4,098 bytes and above the path loses its own last byte, names a keychain that does not exist, nothing
  is written to the scratch keychain (`find-generic-password` answers 44), and the process does not exit
  with stdin at end of file (state S, once R) until it is killed.
- **The buffer counts bytes** (run 3).
- **The longest line that reaches `security` whole is 4,096 bytes, newline included.** Phase 281.1's
  4,097 is a correction to record in `build/p281/SPEC.md` §8.2 and the Phase 281.1 entry when this phase
  lands.
- **Under this scratch `HOME`, `create-keychain` did not add the file to the search list**, and the
  default keychain stayed unresolvable before, during and after every run.
- **Not measured, by the keychain rule:** a line with no keychain path at all (the shipped app's shape),
  because every call here names the scratch keychain. Reasoning only, for the record: in the shipped app
  the cut would fall inside the hex, and `./swap.ts`'s read back would refuse a truncated stage.

---

## 2. Fixed names (every builder writes against these exactly)

**What the attack changed in this section** (section 9 has each problem and its answer). Every other
name is the first pass's, unchanged.
- `setLoginTooLargeListener` now takes `(provider, chosen, outcome)` and `sayLoginTooLarge` takes
  `(host, provider, chosen, outcome)`, with `outcome: 'refused' | 'chosen'`, because a switch that
  stood needs `Restart now` for the chosen login (problem 3).
- A second fixed string, `LOGIN_TOO_LARGE_RUNNING`, for a switch that stood while the running session
  was not moved, and `loginDrawsTooLarge(row)`, the one rule for where the label is drawn (problems 3
  and 5).
- A third fixed string, `LOGIN_TOO_LARGE_SIGNED_IN`, on the tail of `loginSignInDoneLine`, because the
  brief asks for the sentence wherever the failed stage is OBSERVED and the label alone left the
  observe path saying nothing a person reads as a sentence (problem 11). It is one arm in
  `login-copy.ts` and edits no other file.
- `choose` no longer sets `problem` for a result that was `ok: true`; `problem` behaves exactly as
  today (problem 4).
- `LiftResult`'s `ok: true` arm gains `why?`, for a login whose own store holds the same account grown
  past the cap (problem 2, section 2.4's own-store edit).
- `P211_HIS_KEYCHAIN=0` is gone. The probe runs under a scratch `HOME` by default and `P211_REAL_HOME=1`
  is the opt-out this phase never sets (problem 6).
- `src/main/logins/store.ts`'s folder-gone fallback is given as exact text, so builder C can re-anchor
  the ablation that names it (problem 1).

### 2.1 `src/main/credentials/security.ts` (builder A)

```ts
export const SECURITY_LINE_MAX_BYTES = 4_000;

export function securityLineFits(line: string): boolean {
  return Buffer.byteLength(line, 'utf8') <= SECURITY_LINE_MAX_BYTES;
}
```

- **`SECURITY_LINE_MAX_BYTES` replaces `SECURITY_LINE_MAX`.** The old name is removed with no alias, so
  a `.length` comparison against it cannot survive anywhere. Value 4,000 = the measured 4,096 minus a
  stated margin of 96 bytes. Its comment says BYTES, carries section 1.5's numbers and conditions (the
  OS build and the `Security-61439.140.12.706.1` project), and gives the three reasons the value does
  not move up: every line Tortie composes is ASCII (service and account pass `isPlainSecurityName`'s
  `[A-Za-z0-9 ._@+-]`, the payload is hex), so for every shipping line the byte count equals `.length`
  and no line that passes today is refused and no line refused today passes; Claude Code's own writer
  switches at 4,032, 64 below the buffer; and the buffer is one OS build's, which an update can move.
- **`securityLineFits` is the ONLY comparison against the cap in the tree.** It compares the WHOLE line,
  trailing newline and any keychain suffix included.
- **`SecurityRunner.run` answers `Promise<{ code: number; stdout: string; tooLong?: true }>`.** The
  field is optional, so every fake runner in the tree still satisfies the seam.
- **The runner's refusal** (today `security.ts:200-206`) moves to BEFORE `calls += 1` (nothing ran, so
  nothing is counted), which means composing `line` and `input` (today `security.ts:186-199`) before the
  count rather than after it. It asks `securityLineFits` for EVERY `-i` input whether or not a keychain
  file is set, as today, and answers the refusal distinctly:

  ```ts
      if (argv[0] === '-i' && input !== undefined && !securityLineFits(input)) {
        return { code: 1, stdout: '', tooLong: true };
      }
  ```

  `if (!credentialsAreOpen()) return { code: 1, stdout: '' };` stays first (Phase 220).
- **`keychainWrite` keeps `Promise<boolean>` for every refusal that exists today** (a name
  `isPlainSecurityName` refuses, an empty payload, a non-zero exit) and REJECTS with
  `CredentialTooLarge` for this one:

  ```ts
    const command = `add-generic-password -U -a "${account}" -s "${service}" -X "${hex}"\n`;
    if (!securityLineFits(command)) throw new CredentialTooLarge();
    const answer = await runner.run(['-i'], command);
    if (answer.tooLong === true) throw new CredentialTooLarge();
    return answer.code === 0;
  ```

  The command text is byte for byte today's (`security.ts:395`). Both callers already throw on `false`
  (`vault.ts:161-164`, `stores.ts:290-293`), so the rejection travels through them unchanged, and every
  `put` in the tree runs as a `SwapTarget` step inside `safeSwap` (`vault.ts:213`, `:215`;
  `stores.ts:296`, `:305`), whose two catches receive it. Nothing outside `safeSwap` can see it thrown.

### 2.2 `src/main/credentials/swap.ts` (builder A)

```ts
/** A target refused a payload too large for its store (Phase 287). No length, no byte of it. */
export class CredentialTooLarge extends Error {
  readonly why = 'too-large' as const;
  constructor() {
    super('a credential too large for one security line');
    this.name = 'CredentialTooLarge';
  }
}

export type SwapResult = { ok: true } | { ok: false; reason: string; why?: LoginRefusalWhy };
```

It lives in `swap.ts` (which imports nothing today) because the refusal belongs to the one write's
contract rather than to the keychain; `security.ts` imports it from `./swap`, and nothing imports
`security.ts` from `swap.ts`. Both catches in `safeSwap` (stage, `swap.ts:84-88`; commit,
`swap.ts:107-111`) answer, for `err instanceof CredentialTooLarge`,
`{ ok: false, reason: LOGIN_TOO_LARGE_SENTENCE, why: 'too-large' }`, and every other throw exactly
today's sentence. The `finally` discard is unchanged.

### 2.3 The reason's name and the four strings (builder B, `src/shared/`)

`src/shared/logins.ts`:

```ts
/** Why a login change was refused, when the reason has a name of its own (Phase 287). */
export type LoginRefusalWhy = 'too-large';
```

`LoginRow` gains `tooLarge: boolean` (REQUIRED, beside `restores`), documented as: TRUE when the last
observe could not keep the credential this login's store holds because one `security` line cannot carry
it; a boolean and never a length. `defaultLoginRow(provider, chosen, present, email = null,
tooLarge = false)`.

`src/shared/ipc/logins.ts`: `LoginActionResult` gains `why?: LoginRefusalWhy`, present whenever the change
met this refusal, on `ok: false` AND on the `ok: true` partial (section 3, path L3).

`src/shared/login-copy.ts`, the words file every login surface already draws from:

| Constant | Exact bytes | Length | sha256, first 16 |
| --- | --- | --- | --- |
| `LOGIN_TOO_LARGE` | `Too large for Tortie to keep` | 28 bytes, ASCII | `b09299a582f2becf` |
| `LOGIN_TOO_LARGE_SENTENCE` | `This sign in is too large for Tortie to keep in the keychain, so nothing was written over the sign in that is there.` | 116 bytes, ASCII | `41869426fe67ca49` |
| `LOGIN_TOO_LARGE_RUNNING` | `Switched for new sessions. A sign in is too large for Tortie to keep in the keychain, so the running session keeps its current sign in.` | 135 bytes, ASCII | `2a80f0caccda7c9c` |
| `LOGIN_TOO_LARGE_SIGNED_IN` | `This sign in is too large for Tortie to keep in the keychain, and cannot be put back later.` | 91 bytes, ASCII | `421303ed322eb6b2` |

Every length above is `Buffer.byteLength` and `.length` both, because every string is ASCII; the digests
are of the value and were computed by this spec writer with `node -e` over the exact bytes.

**Two sentences on a switch, one per outcome (changed by the attack, problem 3).** `LOGIN_TOO_LARGE_SENTENCE` is the
refusal: it is the `reason` of every `ok: false` this phase composes and the `says` of every refused keep
event, and it is the only sentence a person reads for a switch that did NOT happen (L2, L5 on the own
store). It is true there because every one of these refusals happens before any spawn, and in L2 the sign
in that is too large is the one sitting in the chosen login's own store. It mirrors the sentence `keep.ts`
already says for a keep it could not make ("Tortie could not keep the sign in that is there, so nothing
was written over it."). `LOGIN_TOO_LARGE_RUNNING` is the switch that STOOD: the choice is recorded, the
login's own store was written or already held the account, and the running default session was not moved
(L3, L4, L5 on the default store, L6). It says the outcome first, because the first pass's single sentence
on a switch that stood read as a refusal of the login the person had just chosen, next to a switched toast
that said the opposite. "A sign in" rather than "your own sign in", because in L6 and in L5 on the default
store the sign in that is too large is not the default one. Neither says "Claude", because Tortie's own
vault is the keychain for codex too (finding 4). Neither is the brief's example ("This Claude login is too
large for Tortie to keep in the keychain, so Tortie did not switch to it."), because in four of the six
shapes Tortie DID switch to it. `LOGIN_TOO_LARGE` is the row's short label, in the shape of `LOGIN_KEPT`
("Kept by Tortie"), because a menu sublabel is not the place for a sentence (UI rule, "just enough
words").

**The third sentence is the observe path's, and it is a toast rather than a label (attack, problem 11).**
`LOGIN_TOO_LARGE_SIGNED_IN` is the tail of the sentence a finished sign in already says. It is the one
moment on the observe path where a person did something and a keep was refused because of it, so a
sentence belongs there and a permanent label does not: the row is still in the list afterwards carrying
`LOGIN_TOO_LARGE` when the label rule below draws it, and the toast is gone. Its consequence clause is
"so it cannot be put back later", which is what the refused keep costs the person, and it is true whether
or not an older copy is kept, because a switch back to that login puts back only what was kept and L6
writes nothing.

Copy rules, in `login-copy.ts` (narrowed by the attack, problem 5):
- `export function loginDrawsTooLarge(row: LoginRow): boolean` answers
  `row.tooLarge && row.kept && !row.isDefault`, and it is the ONE place the drawing rule is written. The
  label is drawn only where it changes what a switch does. A kept row that is too large is refused (L2)
  or chosen without moving the running session (L6). A row that is NOT kept switches exactly as today,
  because `activateLogin` answers "Tortie has no kept sign in for this one." before any lift
  (`keep.ts:1018-1026`), and that is every codex row on this Mac (finding 4). The DEFAULT row is never
  drawn with it. Its size matters only for a later switch to some other login while a default session
  runs, and `LOGIN_TOO_LARGE_RUNNING` says it at that moment. A label on the person's own sign in would
  sit there permanently for something that may never happen.
- `loginAccountDetail(row)`: when `loginDrawsTooLarge(row)`, push `LOGIN_TOO_LARGE` after the parts it
  pushes today. Every other row, `tooLarge` or not, reads byte for byte as today.
- `loginSwitchLine(row, isMac)`: answers `''` when `loginDrawsTooLarge(row)`. "Puts this account back."
  would be a promise that the switch either breaks (L2) or does not need (L6). Measured at the parent,
  that row answers `restores: true` today.
- `loginSignInDoneLine(name, row)`: when `row !== null && row.present && row.tooLarge && !row.isDefault`,
  the answer gains ` ${LOGIN_TOO_LARGE_SIGNED_IN}` after the sentence it composes today. The two early
  arms (`row === null`, `!row.present`) are untouched, so a sign in that wrote nothing reads as today.
  The default row is excluded for the reason `loginDrawsTooLarge` excludes it: what a too-large DEFAULT
  store costs a person is that a later switch will not move the running session, which
  `LOGIN_TOO_LARGE_RUNNING` says at that moment, and "it cannot be put back later" is not what the
  default store's size means. `sign-in-watch.ts` is NOT edited: it already posts this function's answer
  as a toast (`src/renderer/state/sign-in-watch.ts:141`), with kind `'success'` for a present store,
  which stays as it is.

### 2.4 The credentials domain's plumbing (builder A, `keep.ts`)

- `KeptFacts` gains `tooLarge: boolean`; `NO_KEPT_FACTS.tooLarge = false`; `factsFromSlot` and the
  captured success answer `false`. It is recomputed by every observe and written to no file.
  **`keptFactsFor` answers `tooLarge: false` by construction** (it answers `factsFromSlot` and attempts
  no write, so it cannot know), and its doc comment says so beside "drives it beside the observe to prove
  the two agree". Any test or gate that compares it with the observe compares `kept`, `restores` and
  `email` only, which is what the gate reads today (`credentials-conformance-probe.mts:1949`, `.kept`).
  (Attack, problem 8.)
- `Capture` gains `why?: LoginRefusalWhy`. `captureReading`'s refused branch (`keep.ts:491-500`), when
  `write.why === 'too-large'`, answers `facts: { ...(await factsFromSlot(...)), tooLarge: true }`,
  `took: 'refused'`, `why: 'too-large'`. The event it pushes already carries `write.reason`, which is now
  the fixed sentence.
- `Promotion` gains `why?: LoginRefusalWhy`, set when the reuse put (`keep.ts:759-765`) or the mint put
  (`keep.ts:802-808`) answered `why: 'too-large'`.
- `LiftResult` and `ActivateResult` gain `why?: LoginRefusalWhy` on BOTH arms (the `ok: true` arm of
  `LiftResult` is new with the attack, problem 2).
- `liftStore`, three edits, each a refusal `{ ok: false, reason: LOGIN_TOO_LARGE_SENTENCE,
  why: 'too-large' }` except the one answer edit 1 names, and every other case exactly as today:
  1. the login's own store (`keep.ts:1319-1324`), when `captured.took === 'refused' && captured.why ===
     'too-large'`, splits on the proof the lift already uses for this store at `keep.ts:1325`:
     - `chosen !== undefined && sameAccountProven(chosen, live)` → `{ ok: true, wrote: false,
       why: 'too-large' }`. **This is L6 (added by the attack, problem 2).** The login's own store
       holds the SAME account Tortie kept, grown past the cap since (for Claude, MCP OAuth entries saved
       by sessions under that login). Nothing needs writing there. Today the click is refused for ever
       with "Tortie could not keep the sign in that is there…", although nothing would be written over
       anything. Refusing it protects no byte. For this store the slot IS `chosenSlot`, so `chosen` is
       the very `before` that `captureReading` tested with `sameAccountProven(before, reading)` at
       `keep.ts:487`. The proof held, so nothing was promoted and `changed` is empty. `updateKeptFile`
       still runs first, as it does today;
     - otherwise (a DIFFERENT account, or one not proven the same) → the refusal, as the first pass
       wrote it. That is L2, and the unkept account in the store is exactly what the refusal protects;
  2. **NEW, the loss in finding 3**: inside the `live !== null && live.payload !== null` block, after the
     own-store branch, `if (store.id === null && captured.why === 'too-large')` → `updateKeptFile(d.root,
     changed)` then the refusal. It sits BEFORE the promotion of `before` (`keep.ts:1335-1351`) and before
     `defaultStoreTarget`, so nothing is written over a credential Tortie could not keep. ONLY the
     too-large reason stops the lift; a capture refused for any other reason keeps today's behaviour
     (section 7);
  3. the promotion not held (`keep.ts:1343-1349`): `promoted.why === 'too-large'`.
  And `if (!done.ok) return { ok: false, reason: done.reason, ...(done.why === undefined ? {} :
  { why: done.why }) }` at `keep.ts:1362-1363`.
- `activateLogin`: `if (!own.ok)` (`keep.ts:1083`) carries `own.why`; the default lift's refusal records
  `firstWhy` beside `firstProblem` (`keep.ts:1110-1112`); the partial (`keep.ts:1129-1138`) carries it,
  its composed sentence today's shape with the fixed sentence as its tail.
  **L6 SKIPS THE DEFAULT LIFT (attack, problem 2).** When `own.why === 'too-large'` on the `ok: true`
  arm and a default session of the provider runs, the lift is NOT run: `firstProblem =
  LOGIN_TOO_LARGE_SENTENCE` and `firstWhy = 'too-large'` are recorded in its place, so the `!wrote`
  arm below answers. The only bytes Tortie holds for this account are OLDER than the ones the login's
  own store has moved on to, and `freshenHeld`'s own comment (`keep.ts:831-833`) says why those must
  never be written where a session reads: "A token refresh consumes the refresh token it was made with,
  so of two copies of one account only the newer one can refresh again." Skipping writes nothing, and
  nothing is exactly what today's click writes (it is refused). The shape, which keeps the gate's
  anchor intact (see below):

  ```ts
      if (
        evidence.sessions.some(
          (s) => s.provider === provider && isDefaultLogin(s.login)
        )
      ) {
        if (own.why === 'too-large') {
          // PHASE 287 comment: why the older copy is not lifted
          firstProblem = LOGIN_TOO_LARGE_SENTENCE;
          firstWhy = 'too-large';
        } else {
          // today's lift, unchanged
        }
      }
  ```

  With no default session running, L6 answers today's `{ ok: true, wrote: false, says: 'That account is
  already in place.' }` with NO `why`, because nothing failed: the login is chosen and its own store holds
  its account.
  **A default lift refused as too large never un-chooses the login.** When the own store was NOT written
  (it already held the account, or L6), today's `!wrote` branch (`keep.ts:1124-1127`) would turn the
  default lift's refusal into `ok: false`, and the choice would not be recorded. For
  `firstWhy === 'too-large'` alone it answers `{ ok: true, wrote: false, says: says ?? 'That account is
  already in place.', why: 'too-large' }` instead. The governing reason is the operator's rule and not
  convenience. Today that same click RECORDS the choice (while destroying the default sign in), so
  answering `ok: false` would make a click that works today stop working. Every other default lift
  refusal keeps today's `!wrote` refusal exactly.
- **The gate's anchors in `keep.ts` stay byte for byte.** `conformance:credentials` ablates over sibling
  copies by exact text, and an unmatched `from` is a failure. So these spans must still match after
  builder A's edits: `evidence.sessions.some(` with its two following lines; `const promoted = await
  promoteOutgoing(d, provider, slot, before, kept, changed);` with `if (!promoted.held) {` below it; `const
  before: KeptRecord | undefined = kept.slots[slot];` with `if (before !== undefined) {`; `const copy =
  await vaultPut(d.vault, slot, payload);` with `if (copy.ok) {`; `if (before !== undefined &&
  !sameAccountProven(before, reading)) {`; the lock-then-read span at the top of `liftStore`; `const evidence
  = await liveSessionEvidence(d);` with `if (!evidence.known) {`; the Phase 220 catch and its first comment
  line; and `? await reusableChainLogin(d, provider, slot, kept)`. The edits above add lines inside those
  blocks and rewrite none of these. A "found nothing to edit" on any `keep.ts` or `swap.ts` ablation is
  builder A's defect. The orca ablation over `security.ts` is the one expected exception (section 8).

### 2.5 The logins domain and the renderer (builder B)

- `src/main/logins/store.ts`: `LoginFactsAsk`'s answer gains `tooLarge: boolean`, **and so does the local
  `asked` helper's declared return type** (`store.ts:367-372`), or nothing below it typechecks;
  `listLoginsAsking` passes
  `own.tooLarge` to `defaultLoginRow` and `facts.tooLarge` to every added row; its catch fallback and the
  folder-gone fallback answer `false`; `listLogins` (the cheap list) answers `false`. **The folder-gone
  fallback is written as exactly this text** (store.ts:387-390 today; one field added at the end of the
  last line, nothing else moved), because `conformance:logins` anchors an ablation on those four lines
  and builder C re-anchors it to this text in parallel (attack, problem 1):

  ```ts
        const facts =
          loginDirOnDisk(root, provider, dir) === 'ok'
            ? await asked(provider, dir, row.id)
            : { present: false, email: null, kept: false, restores: false, tooLarge: false };
  ```

  The catch fallback in `asked` (store.ts:376) becomes `return { present: false, email: null, kept:
  false, restores: false, tooLarge: false };`. No ablation names it today.
- `src/main/logins/ipc.ts`: `wholeList` (`ipc.ts:350-363`) answers `tooLarge: kept.tooLarge`. The
  `logins:choose` handler carries `why` on the refusal (`ipc.ts:426-430`) and on the answered result
  (`ipc.ts:462-464`) exactly when `put.why` is present, INCLUDING when `activation` is null (the
  `wrote: false` answer in section 2.4), where today's line returns `result` untouched. Without `why`
  every return is byte for byte today's.
- `src/renderer/state/logins.ts` (rewritten by the attack, problems 3 and 4):
  `export type LoginTooLargeOutcome = 'refused' | 'chosen';` and
  `setLoginTooLargeListener(listener: ((provider: LoginProviderId, chosen: string, outcome:
  LoginTooLargeOutcome) => void) | null)`, beside `setLoginSwitchedListener`.
  - **`problem` is exactly today's**: `act` still sets `problem: result.ok ? null : (result.reason ??
    null)` (`logins.ts:163-166`) for every result, `why` or not. A switch that stood leaves `problem`
    null, as it does today, so no stale sentence can wait under the Add login dialog's name field for a
    switch that worked. A refused one (L2) sets it to the refusal sentence, which is today's mechanism
    for every refusal reason.
  - `act` hands its caller the result's `why` beside `ok` (for example by resolving to `{ ok, why }` for
    `choose` while `add` and `remove` keep answering `ok`); its `problem` and `busy` handling do not
    move.
  - `choose`, when `name !== null` and the result carries `why === 'too-large'`: calls the too-large
    listener ONCE with `(provider, name, ok ? 'chosen' : 'refused')` and does NOT call the switched
    listener, whatever `row.restores` says. So a switch that stood gets one toast, not two that disagree.
    For every result without `why`, the switched listener is called exactly as today
    (`logins.ts:118-123`).
- `src/renderer/state/login-switch.ts`: `export function sayLoginTooLarge(host: SwitchNoticeHost,
  provider: LoginProviderId, chosen: string, outcome: LoginTooLargeOutcome): void` posts exactly ONE
  toast, kind `'error'`:
  - `'refused'`: text `LOGIN_TOO_LARGE_SENTENCE`, sticky by the slice's own default, no action. Nothing
    was switched, so nothing is offered.
  - `'chosen'`: text `LOGIN_TOO_LARGE_RUNNING`, `sticky: true`, and the action `LOGIN_RESTART_NOW` over
    `sessionsReachedBySwitch(host.sessions, provider, chosen)`, each restarted with
    `{ underChosenLogin: true }`, the same action `offerRestartNow` builds (share the code rather than
    copy it). Restarting under the chosen login WORKS in every `'chosen'` shape: the chosen login's own
    store was written (L3 partial) or already holds its account (L3 in place, L6). When no session is
    reached, the toast is posted without the action.
  `switchedLine` and `offerRestartNow` are unchanged.
- `src/renderer/state/sessions-slice.ts:517`: install `setLoginTooLargeListener((provider, chosen,
  outcome) => sayLoginTooLarge(get(), provider, chosen, outcome))` beside the switched listener.

### 2.6 The drive and the probe (builder D)

- `src/renderer/app/p202-logins-drive.ts`: `P202LoginRow.tooLarge: boolean` (mapped in `readNow`) and
  `P202Reading.problem: string | null` (`useLogins.getState().problem`). Additive; the drives of p202,
  p203 and p204 ignore both.
- `build/probe-p211-switch.mjs`: the Phase 287 arm (section 5.3), `P211_PARENT_CHECKOUT` (the pattern of
  `P137_PARENT_CHECKOUT`: only the app's cwd and its `out/` move), and **a scratch `HOME` for every
  `security` call and for the app, as the probe's DEFAULT** (attack, problem 6; it replaces the first
  pass's optional `P211_HIS_KEYCHAIN=0`):
  - `scratchHome = join(root, 'home')`, mode 0700, made before the first `security` call. The
    `security()` helper passes `env: { ...process.env, HOME: scratchHome }` to every `spawnSync`, so
    nothing this probe runs reads or writes his keychain preferences.
  - Before `create-keychain`, `security default-keychain` under that `HOME` must exit non-zero with
    "could not be found" in its output, or the probe refuses (exit 2) with nothing written. It is read
    again at the end and graded the same.
  - `list-keychains` (the search list guard, before and after, and the throw when the scratch file is in
    it) runs under the scratch `HOME`, so it reads the scratch `HOME`'s list and never his.
  - The `dump-keychain` inventory of every keychain on the search list (`inventory()`,
    `probe-p211-switch.mjs:253-266`) is NOT run, and one line says so. Reading 11's check of the scratch
    keychain names the file (`dump-keychain <file>`, then `find-generic-password … -w <file>` against
    the scratch file alone, which the helper's own `-w` guard already enforces).
  - His two credential files are compared by `lstatSync` (`size`, `mtimeMs`, `ino`) before and after,
    and no byte of them is read. The Phase 211 mode hashed them.
  - The app's `launchEnv` gains `HOME: scratchHome`, and its args gain `--use-mock-keychain`, the switch
    `build/probe-p127-probes.mjs:335` and `build/probe-home-update-line.mjs:439` already pass, so
    Chromium's own Safe Storage never opens a real keychain either. The harness keychain is still
    `GMUX_HARNESS_KEYCHAIN` under the harness directory, and every `security` child the app starts
    inherits the scratch `HOME`, which is §1's measured condition exactly.
  - `P211_REAL_HOME=1` restores the Phase 211 behaviour byte for byte (real `HOME`, the `dump-keychain`
    inventory, the hashes). It exists for Phase 211's own reruns, its header line says it reads the
    attributes of every keychain on his search list, and **no run of this phase sets it**, at the parent
    or at HEAD.

### 2.7 The native menus

The login popup (`src/renderer/app/login-menu.ts`, through `ui:popupMenu`) gains the label in the
sublabel of a row `loginDrawsTooLarge` answers true for, through `loginRowDetail`, and loses the switch
line on that row. Every other item, including the default row and every codex row on this Mac, reads as
today. `login-menu.ts` itself is not edited. No menu bar item is added, renamed or removed.

---

## 3. Every path a long line can take today, and how each refuses

The ONLY product `security -i` call is `keychainWrite` (`security.ts:397`). Every file under `src/main`
that names `/usr/bin/security` or `SECURITY_BIN` is one of `credentials/security.ts`,
`usage/credentials.ts` and `usage/login-accounts.ts`. Outside tests, `grep -rn "'-i'" src/main` finds
exactly three hits, all in `security.ts` (`:189`, `:204`, `:397`). (The first pass named a fourth hit
that does not exist, so it is removed. Attack, problem 10.) The two readers under `usage/` ask
`find-generic-password` and never write.

| # | Path | Today (`a4f44588`) | After this phase |
| --- | --- | --- | --- |
| S1 | `keychainWrite` with a line over the cap (`security.ts:396`) | answers `false` by `.length`, spawns nothing | rejects `CredentialTooLarge` by bytes, spawns nothing |
| S2 | `defaultSecurityRunner` `-i` with a keychain file whose suffix takes it over (`security.ts:204`) | `{code:1}` by `.length`; a non-ASCII path passes: 4,100 bytes SENT (finding 5); the call is counted | `{code:1, tooLong:true}` by bytes, before the count; `keychainWrite` turns it into `CredentialTooLarge` |
| V1 | the observe's keep, `captureReading` → `vaultPut` (`keep.ts:491`) → vault stage | event `refused` "Nothing could be written, so nothing changed.", logged as `{provider, kind}` only; facts as if never kept, and `restores: true` when an older copy is kept (measured, scenario 2) | same write outcome; the event says the fixed sentence; facts `tooLarge: true`; a KEPT non-default row draws `LOGIN_TOO_LARGE` and no switch line, every other row reads as today (section 2.3), and a sign in that is what made the observe happen says `LOGIN_TOO_LARGE_SIGNED_IN` in its own toast (problem 11) |
| V2 | promotion into a login, reuse or mint (`keep.ts:759`, `:802`) | event `refused`, `held: false` | same, `why` carried; in a lift, the fixed sentence (L4) |
| V3 | `freshenHeld` (`keep.ts:862`) | `held: true` with the older bytes, silent | unchanged |
| V4 | the rolling copy after a lift (`keep.ts:1368`) | `copy.ok` false is skipped | unchanged (the default slot's stage line is 98 bytes against a login slot's 107, so a payload already kept always fits) |
| V5 | the Phase 208 migration (`migrate.ts:244`) | `kept += 1`, the old item stays | unchanged |
| L1 | a switch whose own store holds a credential equal to the kept one | no write | unchanged |
| L2 | a switch whose own store holds a DIFFERENT over-cap credential (`keep.ts:1319-1324`) | `ok:false` "Tortie could not keep the sign in that is there, so nothing was written over it." (measured); the card draws NOTHING, and Settings draws nothing either, because the only product choose is the card's and Settings is a separate renderer with its own copy of the store (attack, problem 4) | `ok:false` with the fixed sentence and `why`; ONE error toast on the card; `problem` set to the sentence in the main window's store exactly as today for any refusal reason; the store is untouched in both |
| L3 | **the default lift over an over-cap default store** (`keep.ts:1299-1362`) | **writes over it; the person's own sign in is gone** (finding 3); answer "X is signed in again.", the choice recorded | refused before any write; the default item holds its bytes; the choice still recorded: the partial with `why` when the login's own store was written, `{ok:true, wrote:false, why}` when it already held the account (section 2.4) |
| L4 | the default lift whose promotion of the old default slot is refused as too large (`keep.ts:1343-1349`, payload 1,947 to 1,951 bytes) | "Tortie could not keep the sign in that is there, so nothing was written over it." | the fixed sentence and `why` |
| L5 | the vendor store's stage, `keychainTarget.put` (`stores.ts:290`) → `safeSwap` (`keep.ts:1362`), reachable when the vendor account is longer than 18 bytes (vendor stage overhead 89 + account bytes, vault stage 107) | "Nothing could be written, so nothing changed." | the fixed sentence and `why` |
| L6 | **a switch whose own store holds an over-cap credential for the SAME account Tortie kept** (`keep.ts:1319-1325`), which is a login whose sessions have added MCP OAuth entries since | `ok:false` "Tortie could not keep the sign in that is there, so nothing was written over it."; nothing written; **the choice not even recorded** (finding 6, measured); the row promises "Puts this account back." | `{ok:true, wrote:false, why}`: the choice recorded, both stores untouched, the default lift SKIPPED, one `LOGIN_TOO_LARGE_RUNNING` toast with `Restart now`, and the row draws the label and no promise |
| X1 | `build/probe-p208-vault.mjs:335`, a probe's own `-i` planting into a scratch keychain | payloads are fixed ~100 byte literals, lines under 400 bytes | not in this phase |

The fixed overheads, in bytes, that decide where each write refuses (payload P bytes is refused when
overhead + 2P > 4,000): vault stage, login slot 107 (P > 1,946); vault stage, codex login slot 106;
vault stage, default slot 98 (P > 1,951); vault commit, login slot 99; vendor login stage 89 + account;
vendor login commit 74 + account; vendor default stage 80 + account. A harness keychain path of N bytes
adds N + 3.

---

## 4. The gates

Both gates run their ablations over dot-named SIBLING COPIES under `src/main/` and remove them in a
`finally`; neither edits a shipping file, so no ablation here needs a restore. `conformance:logins`
already hashes the shipping sources before and after (`shipping sources sha256 ... before and after`),
and that reading must still agree. Baselines at the parent, run by this spec writer:
`conformance:credentials` exit 0 in 46 s, 66 of 66 ablations red; `conformance:logins` exit 0 in 13 s,
25 of 25 ablations red.

### 4.1 `conformance:credentials` rule 21 (builder C)

`build/conformance-credentials.mjs` header gains rule 21, "A LINE `security` WOULD CUT IS REFUSED BY ITS
BYTES, AND THE PERSON IS TOLD". `VERDICT_PARTS` gains `lineCap`; `verdict()` adds
`JSON.stringify(d.lineCap)`; the probe (`build/credentials-conformance-probe.mts`) gains the `lineCap`
arm, importing `security.ts` from `MODULES` like its other modules and the strings it pins from
`@shared/login-copy`. The arm runs while `credentialsAreOpen()` is true (put it before the Phase 220
shutdown arm, and record the answer).

Clauses, scanned (`stripComments` first, over the tree AND over each ablated copy, the way rule 20b's
`vendorKeychainSites(dir)` is):
- (a) `SECURITY_LINE_MAX_BYTES` is declared once, in `security.ts`, and its value is at most
  `4_096 - 96`, the 4,096 being section 1's measurement written in the gate with this file cited. The
  old identifier `SECURITY_LINE_MAX` (not followed by `_BYTES`) appears in no code under `src/`.
- (b) `securityLineFits`'s body names `Buffer.byteLength(` and `SECURITY_LINE_MAX_BYTES` and no
  `.length`; `SECURITY_LINE_MAX_BYTES` appears in `security.ts`'s code exactly twice (its declaration and
  that body). **The count is scoped to that one file** (attack, problem 9): the rewritten
  `p2811-line-limit.test.ts` names it, and so does the gate's own `lineCap` arm, and a count over `src/`
  would be red the moment the phase's own tests exist.
- (c) the set of non-test files under `src/main` naming `/usr/bin/security` or `SECURITY_BIN` is exactly
  the three in section 3, and among those three the token `'-i'` appears only in `security.ts` (the shell
  flag in `machines/remote-scripts.ts` names no `security` and is outside the set); there,
  `runner.run(['-i']` occurs exactly once, inside `keychainWrite`'s body with `securityLineFits(` before
  it; and in
  `defaultSecurityRunner`'s body the `-i` refusal names `securityLineFits(` before `calls += 1` and before
  `runGuarded(`.

Clauses, driven (`out.lineCap`):
- (d) `securityLineFits('é'.repeat(2_000))` is true (4,000 bytes) and `securityLineFits('é'.repeat(2_000)
  + 'x')` is false (4,001 bytes, 2,001 units).
- (e) `keychainWrite` over a recording runner: a line of exactly `SECURITY_LINE_MAX_BYTES` bytes is sent
  once and equals `add-generic-password -U -a "<a>" -s "<s>" -X "<hex>"\n` byte for byte; two bytes more
  rejects `CredentialTooLarge` with zero runner calls.
- (f) `defaultSecurityRunner(<scratch path of multi-byte letters>, '/nonexistent/p287-security')`: a bare
  line whose suffixed form is at most the cap in `.length` and over it in bytes answers
  `{code:1, stdout:'', tooLong:true}` and leaves `securityCallCount()` where it was; a line under the cap
  in bytes reaches the spawn (a spawn error for the missing program, no `tooLong`, the count moves by one).
  Nothing is started either way.
- (g) over the probe's own keychain model with `keychainVault` and `keychainForClaude: true`: `vaultPut`
  of an over-cap payload answers exactly `{ok:false, reason: LOGIN_TOO_LARGE_SENTENCE, why:'too-large'}`;
  an observe of an over-cap default Claude store answers facts `''` with `tooLarge: true` and an event
  saying the sentence; activating a login whose own store holds a different over-cap credential (L2)
  answers `ok:false` with the sentence and `why` and leaves that item byte identical; the default lift
  over an over-cap default store with a default session live (L3) leaves the default item holding its
  bytes and answers with `why`, both when the login's own store is written (the partial) and when it
  already held the account (`ok: true, wrote: false`); a vendor account of 60 characters and a payload
  that fits the vault but not the vendor stage (L5) answers the sentence and `why`.
- (g2) **L6, the login whose own store grew past the cap under the SAME account** (added by the attack,
  problem 2): a login kept while small whose store now holds an over-cap credential for the account
  Tortie kept answers `{ok:true, wrote:false, why:'too-large'}` with a default session live AND with none;
  its own item is byte identical afterwards; the default item is byte identical afterwards (the lift is
  not run); and the chosen name is recorded in the logins file both times. The same fixture with a
  DIFFERENT account in the store answers `ok:false` (that is L2), which is the control that proves the
  split is the account proof and not the size.
- (h) no regression: the arm's under-cap switch sends exactly the `-i` lines it sends today (the existing
  `keychain` arm's readings must not move either).

Ablations, one per clause, each over a sibling copy and each required to move `lineCap` or the scan
reading (the gate reports which, as it does for every ablation):

| # | Name | Edit | Must move |
| --- | --- | --- | --- |
| 1 | the cap compared in UTF-16 units | `Buffer.byteLength(line, 'utf8')` → `line.length` in `securityLineFits` | (b), (d), (f) |
| 2 | the runner sends an `-i` line over the cap | the runner's `securityLineFits` refusal removed | (c), (f) |
| 3 | `keychainWrite` sends a line over the cap | its `if (!securityLineFits(command)) throw ...` removed | (c), (e) |
| 4 | the refusal flattened into false | `throw new CredentialTooLarge()` → `return false` in `keychainWrite` | (e), (g) |
| 5 | the one write forgets the reason | `safeSwap`'s `instanceof CredentialTooLarge` arm removed | (g) |
| 6 | the default lift writes over a sign in it could not keep | the new `store.id === null && captured.why === 'too-large'` refusal removed | (g), the L3 reading |
| 7 | the row is not told | `tooLarge: true` dropped from the refused capture's facts | (g), the observe reading |
| 8 | the own store refusal says the ordinary sentence | the too-large arm of `keep.ts`'s own-store refusal removed | (g), the L2 reading |
| 9 | the cap raised past the measured buffer | `SECURITY_LINE_MAX_BYTES = 4_000` → `4_200` | (a) |
| 10 | a too-large default lift un-chooses the login | `activateLogin`'s `firstWhy === 'too-large'` arm of the `!wrote` branch removed, so it answers `ok: false` | (g), the L3 in-place reading |
| 11 | a login that grew past the cap stays refused for ever | the `sameAccountProven` split in the own-store too-large arm removed, so both answers are the refusal | (g2), the L6 reading |
| 12 | the older copy is lifted over the running session anyway | `activateLogin`'s `own.why === 'too-large'` skip of the default lift removed | (g2): the default item's bytes change and the L6 answer moves |

Ablations 11 and 12 are the attack's (problem 2), and they are the pair that proves L6 is two decisions
and not one: 11 takes out the answer, 12 takes out the skip, and each reddens on its own.

**The existing ablation "the payload put on a command line the way orca does it" must be re-anchored in
the same commit**: its `from` names `if (command.length > SECURITY_LINE_MAX) return false;`, which this
phase removes, and an unmatched `from` is a gate failure ("found nothing to edit"). Its `to` stays the
argv form; its point, that no payload reaches a command line, is unchanged.

### 4.2 `conformance:logins` rule 19 (builder C)

`src/shared/login-copy.ts`, `src/shared/logins.ts` and `src/main/logins/` are all under this gate's paths.
Rule 19, "THE ROW IS TOLD, AND THE CHOICE CARRIES ITS REASON":
- driven through the shipping `listLoginsAsking` (from the probe's copy of the logins domain) with an ask
  answering `tooLarge: true` for the default and for one added row: both snapshot rows carry it; an ask
  that throws answers `false`; `listLogins` answers `false`;
- read by matching braces from the `logins:choose` handler's own span (rule 12's `handlerSpanOf`): the
  refusal return and the answered return each carry `why` from `put.why`, the answered return in both of
  its arms (with an activation sentence and without one);
- scanned: `LOGIN_TOO_LARGE_SENTENCE`'s bytes appear in exactly one non-test file under `src/`,
  `login-copy.ts` (the tests under `__tests__/` pin the words on purpose and are outside the count), and
  `swap.ts` and `keep.ts` name the constant rather than the words;
- driven over `login-copy.ts` itself, because this gate already imports it: `loginDrawsTooLarge` answers
  true only for a row that is `tooLarge && kept && !isDefault`, over the four combinations; a row it
  answers true for draws `LOGIN_TOO_LARGE` in `loginAccountDetail` and an empty `loginSwitchLine` even
  with `restores: true`; and `loginSignInDoneLine` of a present non-default `tooLarge` row ends with
  `LOGIN_TOO_LARGE_SIGNED_IN` while the default row's answer and both not-present arms are byte for byte
  what the same call answers with `tooLarge: false`.
Ablations over sibling copies, three: the default row's `tooLarge` dropped in `listLoginsAsking`; `why`
dropped from the choose handler's refusal; the `tooLarge` arm of `loginSignInDoneLine` removed. The
shipping sha256 before and after must still agree.

**One existing ablation must be re-anchored in the same commit** (attack, problem 1). `a login whose
folder is gone asked about anyway` (`build/conformance-logins.mjs:1484-1498`) names, as its `from`, the
four lines of `store.ts:387-390` ending `: { present: false, email: null, kept: false, restores: false };`,
and section 2.5 adds `tooLarge: false` to that literal. The gate applies an edit with
`before.includes(edit.from)` and reports "found nothing to edit" as a failure
(`build/conformance-logins.mjs:1859-1863`), so this gate goes RED until builder C re-anchors it to the
exact text section 2.5 gives. Its `to` (`const facts = await asked(provider, dir, row.id);`) does not
change, and neither does what it proves. The catch fallback in `asked` (`store.ts:376`) is named by no
ablation in either gate, checked by this spec writer over both files' ablation tables, so it needs no
re-anchor.

### 4.3 What the attack verifier should try (not built, stated so it is tried)

A service and account at 200 characters each; a harness path of 1,024 three-byte characters
(`isPlainKeychainPath` caps UTF-16 units, not bytes, so the suffix alone is over the cap and every `-i`
call must refuse); NFD against NFC spellings of the same path; a four-byte emoji; a line at cap − 1, cap,
cap + 1 bytes; a stage that fits and a commit that does not (impossible by construction, since the staged
name is longer, and worth showing); a runner that answers `tooLong` for a line `keychainWrite` thinks
fits. And for L6, the shape the answer turns on: a login whose own store grew past the cap while the
address is known on ONE side only, so `sameAccountProven` cannot prove anything — it must answer the
refusal (L2) and must NOT take the lift-skip, because an account that is not proven the same is an
account the refusal is protecting.

---

## 5. The proof

### 5.1 Tests, red at the parent

Builder A:
- `src/main/credentials/__tests__/p2811-line-limit.test.ts`, rewritten to bytes: (i) a scratch keychain
  path of multi-byte letters whose suffixed line is 4,000 in `.length` and over 4,000 in bytes is refused
  with `tooLong: true`, the recording `/bin/sh` program is NOT spawned, and `securityCallCount()` does not
  move. **At the parent it is spawned** (finding 5, measured). (ii) `keychainWrite` two bytes over the cap
  rejects `CredentialTooLarge` and never calls its runner; **at the parent it resolves `false`**. (iii) a
  line of exactly `SECURITY_LINE_MAX_BYTES` bytes is sent byte for byte. (iv)
  `SECURITY_LINE_MAX_BYTES <= 4_096 - 96`, citing this file. (v) `securityLineFits` over `é` strings as
  in 4.1 (d).
- `src/main/credentials/__tests__/p287-too-large.test.ts` (new), over `keychainVault` and the Phase 281
  `first-match-security.ts`: (i) `vaultPut` over the cap answers the sentence and `why`; **parent:
  "Nothing could be written, so nothing changed." with no `why`**. (ii) the observe of an over-cap default
  store: facts `''` `tooLarge: true`, the event says the sentence; **parent (measured):
  `{"kept":false,"restores":false,"email":null}` and "Nothing could be written, so nothing changed."**.
  (iii) L2: `ok:false`, the sentence, `why`, the login's item still its own bytes; **parent (measured):
  "Tortie could not keep the sign in that is there, so nothing was written over it."**, and the observe
  before it answered `restores: true`. (iv) L3: the default item still holds its bytes and the answer
  carries `why`; **parent (measured): `{"ok":true,"wrote":true,"says":"work is signed in again."}` and
  the bytes nowhere in the keychain**; and the same with the login's own store already holding the
  account UNDER the cap answers `{ok:true, wrote:false, why:'too-large'}`, never `ok: false`.
  (iv-b) **L6** (the attack's problem 2), two cases against one control: a login kept while small whose
  own store now holds an OVER-cap credential for the same account answers
  `{ok:true, wrote:false, why:'too-large'}` with a default session live and with none, its own item and
  the default item are both byte identical afterwards, and the chosen name is recorded; the control, the
  same fixture with a different account in the store, answers `ok:false` (L2). **Parent (measured, finding
  6): `{"ok":false,"reason":"Tortie could not keep the sign in that is there, so nothing was written over
  it."}` with a default session live AND with none, every keychain row byte identical, and
  `file.chosen` still `{}` — the click cannot ever succeed.** (v) L5 with a 60
  character vendor account. (vi) L4 with a fake
  vault whose `put` rejects `CredentialTooLarge` for login slots. (vii) under the cap: an ordinary switch
  sends exactly the `-i` lines `p281-stores-address.test.ts` already pins (`:266-268`, `:536`), which
  must stay green unedited.

Builder B (its first two tests are rewritten by the attack, problems 3, 4 and 11):
- `src/renderer/app/__tests__/p287-too-large-copy.test.ts` (new): `loginDrawsTooLarge` over all four
  combinations of `tooLarge`, `kept` and `isDefault` — true only for `tooLarge && kept && !isDefault`; a
  row it answers true for draws `LOGIN_TOO_LARGE` in `loginAccountDetail`, `loginRowDetail` and the menu
  sublabel and draws NO switch line even with `restores: true`; **a row it answers false for, `tooLarge`
  or not, reads byte for byte what the same row reads with `tooLarge: false`** (the codex row on this
  Mac and the default row are that case, problem 5); `loginSignInDoneLine` of a present non-default
  `tooLarge` row ends with `LOGIN_TOO_LARGE_SIGNED_IN` while the default row's answer and both
  not-present arms are byte for byte today's; every existing copy test stays green with
  `tooLarge: false` added to its row literals. All four strings pinned by exact value.
- `src/renderer/state/__tests__/p287-too-large-say.test.ts` (new), over a stubbed bridge:
  - a choose answered `ok: false` with `why: 'too-large'` sets `problem` to the sentence (which is what
    today's `act` does with any `reason`) and calls the too-large listener once with `'refused'`;
  - **a choose answered `ok: true` with `why: 'too-large'` leaves `problem` NULL**, calls the listener
    once with `'chosen'`, and does NOT call the switched listener even with `row.restores` true. The
    null is the point: `problem` is drawn by `AddLoginModal` (`:53`, `:142-143`), which never clears it
    when it opens (`:60-66` resets `error` only), so a sentence left there after a switch that worked
    would turn up later under the Add login name field (problem 4);
  - a choose refused for any other reason sets `problem` to that reason, calls the too-large listener
    zero times, and calls the switched listener exactly where today's code calls it;
  - `sayLoginTooLarge` posts exactly ONE toast: `'refused'` → kind `'error'`, text
    `LOGIN_TOO_LARGE_SENTENCE`, no action; `'chosen'` → kind `'error'`, text `LOGIN_TOO_LARGE_RUNNING`,
    sticky, with the `LOGIN_RESTART_NOW` action over `sessionsReachedBySwitch`'s answer, and no action
    when that answer is empty. No test asserts a switched toast beside either.
- `src/main/logins/__tests__/p203-whole-list.test.ts`: the default and an added row carry `tooLarge` from
  the ask.

### 5.2 Gates

`npm run typecheck`, `npm run conformance:credentials` (rule 21, 66 + 12 ablations red), `npm run
conformance:logins` (rule 19, 25 + 3 ablations red), and the scoped vitest of every file in section 8.
The battery, the build and the smokes are the main session's.

### 5.3 The app run: `probe:p211`, extended (builder D), run by the MAIN SESSION

No new script under `build/`, so `HELPER_USER_FLOOR` stays 144 (`build/assert-electron-teardown.mjs:243`)
and `package.json`'s `probe:p211` is unchanged. The probe already launches one Electron through
`withElectron` with `GMUX_HARNESS_KEYCHAIN` on a scratch keychain made under the harness directory, so
Tortie's own vault is the REAL keychain vault over that file and every keep goes through `keychainWrite`,
and its stores are codex FILES the probe writes, which is also the shape finding 4 says is over the cap
in real life. The arm runs after reading 5, inside the same launch:

**Every wait in the arm waits on something BOTH builds can answer** (attack, problem 7). At `a4f44588`
`src/renderer/app/p202-logins-drive.ts` carries neither `tooLarge` nor `problem` (its reading has
`problems`, the file's list, at `:62` and `:162`), so a parent run can never satisfy a wait for
`tooLarge`, and a throw there would stop the arm before the readings that matter — the store bytes, which
are the whole loss measurement. So: every `tooLarge` reading is GRADED and never waited on at the parent
(the grader answers `unreadable, the drive predates the field` and that is the expected parent value),
and each step waits instead on a reading both builds have, named below.

6. Write `BIG4`, a synthetic codex credential of exactly 4,193 bytes (the size `stat` read, sentinel
   `P287-`, no `OPENAI_API_KEY`, account `four`), into the default codex store from outside. **Wait up to
   20 s for the promotion both builds make**: the row for `three.example` appearing in the list (the
   watcher's own observe made it). Then read the default codex row's `tooLarge` — true at HEAD,
   **unreadable at the parent**. Traced through the shipping code: after step 5 the default slot holds
   `three`, so this observe promotes `three` into `three.example` (a small put that fits) and then
   refuses the keep of `BIG4`; the default slot's record stays `three`.
7. Choose the default login, then open a codex session on it, so a default session is live (after
   Restart now in step 4 the earlier session runs under `one.example`).
8. Choose `two.example` (a kept small account whose own store is empty, so its own store IS written) while
   the default session runs. Traced: the own lift writes `two`; the default lift reads `BIG4`, finds the
   outgoing `three` already held by `three.example`, and its keep of `BIG4` is refused as too large; at
   HEAD it stops there and the answer is the partial with `why`, at the parent it writes `two` over
   `BIG4`. Read:
   - the default store's bytes by sha256 still `BIG4` (**parent: holds `two`**, the loss). This is the
     reading the whole arm exists for, and nothing above it may throw;
   - `two.example`'s own store holds `two` (both builds);
   - the toasts contain `LOGIN_TOO_LARGE_RUNNING` exactly once (**parent: absent**), and **the switched
     line for `two.example` is ABSENT at HEAD** (`switchedLine('two.example')`, graded as a forbidden
     string) while it is PRESENT at the parent. One switch says one thing (attack, problem 3): at the
     parent the person is told the switch took effect while the default session had just been moved by
     destroying `BIG4`; at HEAD the running session was deliberately not moved and the toast says so,
     with `Restart now` still on it;
   - `problem` is NULL at HEAD (attack, problem 4: an `ok: true` answer leaves it null, so nothing waits
     under the Add login dialog's name field), **unreadable at the parent**.
9. Write `BIG5`, a different 4,193 byte credential (account `five`), into `one.example`'s own store (its
   id read from the profile's logins file). **Wait up to 20 s for the promotion both builds make**, the
   new login row (`one.example 2`) appearing in the list. Traced through the shipping code: the observe
   promotes the kept `one` into that login (whose small put fits) and refuses the keep of `BIG5`, so the
   row answers `restores: true` and, at HEAD, `tooLarge: true`. With `two.example` chosen after step 8,
   choose `one.example`. Read: the toasts contain `LOGIN_TOO_LARGE_SENTENCE` exactly once (**parent:
   none**), no switched line either build, that store still `BIG5` by sha256 (both builds), and `problem`
   the sentence at HEAD (**parent: unreadable; the parent's own refusal sentence, "Tortie could not keep
   the sign in that is there, so nothing was written over it.", is graded from the app's stderr line
   instead when `P211_ECHO=1`, and is otherwise recorded as not read**).
10. **L6, the login that grew** (attack, problem 2, finding 6). Write `BIG6`, a 4,193 byte credential for
    the SAME account `two` that `two.example`'s own store now holds, over that store, and wait for the
    list to answer at all (no promotion happens here, so the wait is one ordinary read after the
    watcher's observe). Read the row: at HEAD `tooLarge` true, its detail carries
    `Too large for Tortie to keep` and no switch line (**parent: `restores: true` and "Puts this account
    back." — the promise the click cannot keep**). Then choose `two.example`, which is the row already
    chosen, exactly as a person picks a row that is ticked. Read: at HEAD one
    `LOGIN_TOO_LARGE_RUNNING` toast and no switched line, `two.example`'s own store still `BIG6` by
    sha256 and the default store still `BIG4` by sha256; **parent: no toast at all, and both stores as
    step 8 left them — which in the default store's case is `two`, the loss step 8 already recorded**.
    Finding 6 measured the parent's answer through the domain, so the parent's evidence here is the
    toast's absence and the row's promise rather than a byte moving.
11. The scratch keychain, attributes then `-w` against the scratch file only, holds no item whose payload
    digest is `BIG4`'s, `BIG5`'s or `BIG6`'s (both builds).

Each reading has a grader and `--self-test` fixtures, green and red, in the file's existing shape.
`build/verification-checks.mjs`'s comment at the `probe:p211` classification says what the arm drives;
its classification does not change.

**The parent run.** Build a worktree at `a4f44588` (`npm run build` there), then
`P211_PARENT_CHECKOUT=<that worktree> node build/harness-socket.mjs --fresh gmux-p211 'node
build/probe-p211-switch.mjs'`. Expected: readings 1 to 5 as at HEAD (the no-regression half), and the
Phase 287 readings as section 5.3 says "parent", with every `tooLarge` and `problem` reading recorded as
`unreadable, the drive predates the field`. Run the parent FIRST, so a p211 reading already red at the
parent for another reason is recorded as the parent's and not charged to this phase.

**Neither run touches the operator's keychain** (attack, problem 6, and this phase's keychain rule).
Section 2.6 makes the scratch `HOME` the probe's DEFAULT, drops the `dump-keychain` inventory of every
keychain on the search list, and puts `list-keychains` under that same `HOME`; `security default-keychain`
must answer "could not be found" under it before anything is created, and it is read again at the end.
`P211_REAL_HOME=1` restores Phase 211's behaviour for Phase 211's own reruns and **no run of this phase,
at the parent or at HEAD, sets it**. There is nothing here the main session has to remember to switch off,
because the safe path is the default and the unsafe one has to be asked for.

---

## 6. The no-regression list

Every credential write and switch a person does today, with today's outcome. The verifier measures both
builds on each row; rows marked **changes** are the phase and nothing else may differ.

| # | What the person does | Today at `a4f44588` | After |
| --- | --- | --- | --- |
| 1 | Any observe (list, hover, boot, watcher) of an under-cap store, either provider | kept; `-i` stage then commit, `add-generic-password -U -a "tortie" -s "Tortie-credentials-<slot>[.pending]-<8hex>" -X "<hex>"\n`, read back, discard | byte for byte the same lines, same count of `security` calls |
| 2 | `/login` in a session, under-cap account left | promoted into a login named from its address | same |
| 3 | Choose a kept under-cap login, no default session | own store written (Claude: stage `Claude Code-credentials-<8hex>.tortie-pending` under `-a <vendor account>` first, commit, discard), "X is switched." and Restart now | same lines, same toast |
| 4 | Choose a kept under-cap login, default session running, under-cap default store | own store and the default item written, the default account promoted first | same |
| 5 | Choose the default | "Your own sign in is used as it is.", nothing written | same |
| 6 | Choose a login with nothing kept | no write, no sentence | same |
| 7 | Choose a login whose store was signed into again (under cap) | captured, "X was signed into again just now, so nothing was put back." | same |
| 8 | A lock held past the wait, sessions unknown, an unclassified throw | their sentences in Settings, nothing on the card | same (no toast: they carry no `why`) |
| 9 | Remove a login | vendor item, slot, staged slot and record cleared | same |
| 10 | The Phase 208 migration | counts in the boot line | same |
| 11 | The meter's reader (`-w`) | reads whatever length | same, untouched |
| 12 | **Codex on macOS, a real credential (4,193 bytes here)** | every keep refused silently, no codex account ever kept, codex switches never write | same writes and refusals, and **the row reads byte for byte as today**: no codex row on this Mac is `kept`, so `loginDrawsTooLarge` answers false and no label is drawn (attack, problem 5). The data carries `tooLarge: true` and nothing draws it |
| 13 | A Claude default store over the cap (MCP OAuth entries), no default session | keep refused silently | the row reads as today: the DEFAULT row is never drawn with the label, because its size changes nothing until a switch happens while a default session runs, and row 14 says it then |
| 14 | Choose a kept login with a default session running and an over-cap default store | **the default sign in is overwritten and lost**, "X is switched." with Restart now, the login chosen | **changes**: the default item untouched; the login still chosen and its own store still written; ONE error toast carrying `LOGIN_TOO_LARGE_RUNNING` with `Restart now` on it, and the switched toast NOT posted, because two toasts that disagree is what the attack found (problem 3); `problem` stays null, so Settings and the Add login dialog say nothing (problem 4) |
| 15 | Choose a login whose store holds a DIFFERENT over-cap credential (L2) | refused with "Tortie could not keep the sign in that is there, so nothing was written over it."; the row promised "Puts this account back." | **changes**: refused with `LOGIN_TOO_LARGE_SENTENCE`, one error toast on the card, `problem` set to it as today for any refusal; the row draws the label and no promise |
| 16 | A harness launch with an ASCII scratch keychain path | as today | same |
| 17 | A harness launch with a non-ASCII scratch path | lines up to 4,000 units sent, some over the buffer (hang) | **changes**: lines over 4,000 bytes refused, never counted |
| 18 | `securityCallCount` in the boot line | shipped app never counts a refused line | same in the shipped app; a harness runner refusal no longer counts |
| 19 | **Choose a kept login whose own store GREW past the cap under the same account** (L6, finding 6) | refused for ever with "Tortie could not keep the sign in that is there, so nothing was written over it."; nothing written; the choice not even recorded; the row promised "Puts this account back." | **changes**: the choice is recorded, both stores untouched, one `LOGIN_TOO_LARGE_RUNNING` toast with `Restart now`, and the row draws the label and no promise. The running default session is NOT moved, deliberately: the only copy Tortie holds is older than the one in that store and a consumed refresh token must not be put where a session reads (`keep.ts:831-833`) |
| 20 | Finish a vendor sign in on a login whose credential is over the cap | "Signed in on X." and nothing else; the keep was refused and nothing said so | **changes**: the same sentence with `LOGIN_TOO_LARGE_SIGNED_IN` after it, in the same toast. On this Mac that is every codex sign in on a non-default login (attack, problem 11; section 10 puts it to the operator) |

Rows 14, 15 and 19 are the phase. Row 14 is also a behaviour change in an everyday flow for anyone whose
default Claude credential carries MCP OAuth entries: today the running default session followed the
switch at the price of the sign in; after, it does not follow, the person is told why, and Restart now
still moves it. Both of those belong in the landing report in the operator's words.

---

## 7. What is NOT in this phase

The entry's list, unchanged:
- No `security` call against any keychain but a scratch one, and no `-w` or `-g` anywhere real.
- No payload on a command line (candidate (b) is not built; `conformance:credentials` keeps its rule).
- No change to how a credential UNDER the cap is written: `-i`, hex, `-U`, `-a` first, as Phase 281 left
  it.
- No change to the meter's reader; it reads whatever Claude Code wrote, however long.
- No release.

And from what this spec found:
- **Not candidate (c) and not a file vault for the oversized case.** Finding 4 argues for one: Tortie can
  keep no real codex account on macOS, and the file backend already exists (`fileVault`, 0600 in 0700).
  That is the follow-up to queue for the operator's ruling, not this phase.
- **Not the same loss for other refusal reasons.** A default lift whose capture was refused for any reason
  other than size (a locked keychain, a timeout, a read back that disagreed) still writes over the unkept
  default sign in, exactly as today. Stated, not fixed, because this phase changes nothing under the cap.
- No toast on the meter card for any other refusal, and the Phase 211 partial sentence stays undrawn in
  the main window for every other reason.
- **No fourth surface for the sentence.** No hover, no tooltip, no disclosure on a login row; native
  menus have no tooltip and the UI rule is "just enough words". The three sentences are: the switch that
  was refused, the switch that stood, and the sign in that could not be kept. The row itself carries the
  28 byte label and nothing longer.
- No change to `sign-in-watch.ts`: its toast kind, its timing and its list refresh are Phase 203's.
- No clearing of `problem` when the Add login dialog opens. It is a real defect for every refusal reason
  (`AddLoginModal.tsx:60-66` resets `error` only), it predates this phase, and this phase avoids it by
  leaving `problem` null on a switch that stood rather than by editing a file no builder here owns.
- No change to `build/probe-p208-vault.mjs`'s own `-i` writer.
- No change to `SECURITY_TIMEOUT_MS`, the discard after a refused stage (one `delete-generic-password`
  that answers 44), or `isPlainKeychainPath`'s unit-based length cap.
- No new script under `build/`; `HELPER_USER_FLOOR` does not move.
- No edit to `CLAUDE.md`, `docs/BACKLOG.md`, `build/p281/SPEC.md` or `CHANGELOG.md` by a builder; the
  landing session records section 1.5's correction to 281.1's 4,097 and appends the running log.

---

## 8. Ownership (disjoint and complete)

**Order.** Builder B writes section 2.3's shared additions (`LoginRefusalWhy`, `LoginRow.tooLarge`,
`defaultLoginRow`'s parameter, `LoginActionResult.why`, the four strings and `loginDrawsTooLarge`) as its
FIRST edit, because A, C and D import them; everyone else writes against section 2's names from the start
and runs typecheck once they exist (`grep -n LOGIN_TOO_LARGE_SENTENCE src/shared/login-copy.ts`).

**Two findings are expected mid-build and are NOT defects**, both because a gate anchors an ablation on a
line this phase rewrites (section 4.1's last paragraph and section 4.2's):
`conformance:credentials` reports "found nothing to edit" for the orca ablation until builder C
re-anchors it over builder A's `security.ts`, and `conformance:logins` reports it for
`a login whose folder is gone asked about anyway` until C re-anchors it over builder B's `store.ts`.
C's run over the INTEGRATED tree is the one that counts, and if either gate still says it there, the
re-anchor is missing.

| Builder | Files, and nothing else | Task |
| --- | --- | --- |
| **A, the cap and the reason** | `src/main/credentials/security.ts`, `src/main/credentials/swap.ts`, `src/main/credentials/keep.ts`, `src/main/credentials/vault.ts` and `src/main/credentials/stores.ts` (comments only, where a comment now says something false), `src/main/credentials/__tests__/p2811-line-limit.test.ts`, `src/main/credentials/__tests__/p287-too-large.test.ts` (new) | Sections 2.1, 2.2, 2.4 exactly; the tests of 5.1 (A). `SECURITY_LINE_MAX` is removed with no alias. No log line, no payload or length in any error. Run the scoped vitest, `conformance:credentials` and `conformance:logins`. |
| **B, the sentence and its surface** | `src/shared/login-copy.ts`, `src/shared/logins.ts`, `src/shared/ipc/logins.ts`, `src/main/logins/store.ts`, `src/main/logins/ipc.ts`, `src/renderer/state/logins.ts`, `src/renderer/state/login-switch.ts`, `src/renderer/state/sessions-slice.ts`, `src/main/logins/__tests__/p203-whole-list.test.ts`, `src/renderer/app/__tests__/p202-login-card.test.ts`, `src/renderer/app/__tests__/p203-account-copy.test.ts`, `src/renderer/app/__tests__/p204-switch-copy.test.ts`, `src/renderer/state/__tests__/p203-sign-in-watch.test.ts`, `src/renderer/app/__tests__/p287-too-large-copy.test.ts` (new), `src/renderer/state/__tests__/p287-too-large-say.test.ts` (new) | Sections 2.3, 2.5, 2.7; `tooLarge: false` added to every existing `LoginRow` literal; the tests of 5.1 (B). Run the scoped vitest, typecheck, `conformance:logins`. |
| **C, the gates** | `build/conformance-credentials.mjs`, `build/credentials-conformance-probe.mts`, `build/conformance-logins.mjs`, `build/logins-conformance-probe.mts` | Section 4.1 and 4.2: rule 21 with its `lineCap` arm and TWELVE ablations, rule 19 with THREE, and BOTH re-anchors (the orca one over `security.ts`, the folder-gone one over `store.ts`, to section 2.5's exact text). Every ablation over a sibling copy. Both gates green over the integrated tree, with the red count printed. |
| **D, the app arm** | `build/probe-p211-switch.mjs`, `src/renderer/app/p202-logins-drive.ts`, `build/verification-checks.mjs` (the `probe:p211` comment only) | Sections 2.6 and 5.3: the arm, its graders and `--self-test` fixtures, `P211_PARENT_CHECKOUT`, the scratch `HOME` as the default and `P211_REAL_HOME` as the opt-out nothing here sets. Run `--self-test` only; the main session launches the app. |

Paths no builder may touch: everything else, and in particular `src/main/usage/**`,
`src/main/credentials/index.ts`, `src/main/harness/**`, `package.json`, `build/assert-electron-teardown.mjs`,
`/private/tmp/wt-p290`, `/private/tmp/wt-p293` and the operator's checkout.

---

## 9. The attack, answered

The attacker's verdict was `needs_work` with six major and five minor problems. Its independent step was a
second measurement of the buffer on its own scratch keychain with three line shapes this spec writer did
not use, and **it agreed with section 1 exactly**: the longest intact line is 4,096 bytes with its
newline, `security -i` reads 4,095 bytes of command per chunk, the count is in bytes (4,098 bytes of
2,147 UTF-16 units hangs), and the 4,000 byte cap leaves 96 bytes of margin. Nothing in section 1 moves.
Its padding-in-the-service-name and closing-quote-at-byte-Q shapes explain run 1's 4,097 byte line from
the other side: the orphan is whatever follows the 4,095th byte, so the quote prints the usage text and a
space prints nothing.

**Every problem is answered by a change to this spec except problems 8 and 10, which the first pass had
already answered and which are recorded here so a reader is not left wondering.** Each answer names where
the spec changed.

| # | Problem | Answer |
| --- | --- | --- |
| 1 | An existing `conformance:logins` ablation is anchored on a line section 2.5 rewrites | **Accepted.** Section 2.5 gives the fallback's exact post-edit text, section 4.2 ends with the re-anchor as a named obligation with the gate's own failure line cited (`conformance-logins.mjs:1859-1863`), section 8 lists it beside the orca one as expected mid-build, and builder C's task names both re-anchors. Verified independently: `grep -n "present: false"` over BOTH gate files finds exactly one hit, `conformance-logins.mjs:1494`, so the catch fallback at `store.ts:376` is anchored by nothing and needs no re-anchor, and no ablation in either gate names any other line this phase rewrites (checked by evaluating every ablation's `from` in both gates and grepping them for `store.id`, `captured.`, `updateKeptFile`, `wrote: false`, `firstProblem`, `own.ok` and the own-store refusal's sentence: no hits) |
| 2 | A login whose own store grew past the cap under the SAME account stays refused for ever | **Accepted, and MEASURED rather than reasoned.** Finding 6 is the new run: the click answers `ok:false` at the parent with a default session live and with none, nothing is written, and `file.chosen` stays `{}`, while the row promises "Puts this account back." The spec takes the attacker's option (i): section 2.4's own-store edit 1 splits on `sameAccountProven` and answers `{ok:true, wrote:false, why:'too-large'}`, and `activateLogin` SKIPS the default lift for that answer, because the kept copy is older than the store's and a consumed refresh token must not be put where a session reads (`keep.ts:831-833`). It is L6 in section 3, (g2) in rule 21, ablations 11 and 12, test (iv-b), probe step 10 and row 19 |
| 3 | An `ok:true` partial posts two contradictory toasts, and the sentence reads as being about the chosen login | **Accepted.** Section 2.5 makes `choose` call the too-large listener ONCE with `'refused'` or `'chosen'` and NOT the switched listener; section 2.3 adds `LOGIN_TOO_LARGE_RUNNING`, which says the outcome first and keeps `Restart now` over `sessionsReachedBySwitch`, since restarting under the chosen login does work; probe step 8 grades the switched line as a FORBIDDEN string at HEAD and a present one at the parent |
| 4 | Setting `problem` on `ok:true` leaves a stale error under the Add login name field, and Settings cannot draw a card's refusal at all | **Accepted, and the first pass's account of the surface was wrong.** Section 2.5 leaves `act`'s `problem` exactly as today, so a switch that stood leaves it null; finding 2, section 3's L2 row and section 6 row 14 no longer claim Settings draws it. Verified: `problem` is read in the main window only by `AddLoginModal.tsx:53` and `:142-143`, whose open effect resets `error` alone (`:60-66`), and in Settings only by `UsageGroup.tsx:311`, a separate renderer with its own store copy whose login block offers `remove` and `load` and no `choose` (`:256-260`; `grep -rn "choose(" src/renderer/settings/` finds nothing) |
| 5 | The codex label needs the operator's ruling BEFORE the build, and it warns about nothing a switch does | **Accepted, and the label is narrowed so there is nothing to rule on.** `loginDrawsTooLarge(row)` = `row.tooLarge && row.kept && !row.isDefault` (section 2.3) is the one drawing rule: no codex row on this Mac is kept (`keep.ts:1018-1026` answers before any lift), so no codex row and no default row draws anything, and rows 12 and 13 of section 6 now say "reads byte for byte as today". The data keeps `tooLarge` for the gate and the probe. What IS drawn for codex is one transient sentence at the end of a sign in (problem 11), and section 10 puts that single line to the operator |
| 6 | The app run's own `security` calls break this phase's keychain rule unless an optional flag is set | **Accepted, and the optional flag is gone.** Section 2.6 makes the scratch `HOME` the probe's default for every `security` call AND for the app, checks `default-keychain` under it before anything is created and again at the end, drops the `dump-keychain` inventory of every keychain on the search list, moves `list-keychains` under the scratch `HOME`, compares his two credential files by `lstat` instead of hashing them, and adds `--use-mock-keychain` to the app's args. `P211_REAL_HOME=1` is the opt-out, for Phase 211's own reruns, and no run of this phase sets it. Verified the danger was real: `inventory()` at `probe-p211-switch.mjs:253` runs `dump-keychain` with no keychain argument through a helper that passes no `env`, so it inherits his `HOME` |
| 7 | The parent half of the arm cannot read `tooLarge` or `problem`, and a wait that can never succeed could stop the loss measurement | **Accepted.** Section 5.3 now says every `tooLarge` and `problem` reading is GRADED with the expected parent value `unreadable, the drive predates the field`, and each step waits instead on something both builds answer (the promotion of `three.example`, then of `one.example 2`), so the sha256 of the default store — the loss — always runs. Verified at `a4f44588`: `p202-logins-drive.ts` names `problems` at `:62` and `:162` and neither `tooLarge` nor `problem` |
| 8 | `keptFactsFor` will disagree with the observe on `tooLarge` | **Already answered, and kept.** Section 2.4 states that `keptFactsFor` answers `tooLarge: false` by construction, because it answers `factsFromSlot` and attempts no write, and that its doc comment says so beside the "driven beside the observe" sentence. Verified that nothing compares the two whole: `credentials-conformance-probe.mts:1949-1951` compares `factsOf(a)` with `factsOf(b)`, two readings of the OBSERVE, and reads `keptFactsFor(...).kept` alone |
| 9 | Clause (b)'s "exactly twice" has no scope and the phase's own tests would break it | **Accepted.** Clause (b) now counts inside `security.ts` only, and says why |
| 10 | Section 3 named a fourth `'-i'` hit that does not exist | **Already corrected by the first pass**, and re-verified: `grep -rn -- "'-i'" src/main` excluding `__tests__` answers exactly `security.ts:189`, `:204` and `:397`. The shell `-i` in `machines/remote-scripts.ts:1502` is inside a double-quoted script string and names no `security`, which is why it is outside both the grep and clause (c)'s file set |
| 11 | The fixed sentence reaches no surface on the OBSERVE path; the spec draws a 28 byte label instead | **Accepted, and a sentence is added where the observe is something a person did.** `LOGIN_TOO_LARGE_SIGNED_IN` (93 bytes) is the tail of `loginSignInDoneLine` for a present non-default `tooLarge` row (section 2.3), which `sign-in-watch.ts:141` already posts as a toast, so no file outside `login-copy.ts` is edited for it. The label stays the row's resting face, because a row is read every time the menu opens and a sentence there is the paragraph the operator refused. The other place the attacker named, the `KeepEvent` logged as `{provider, kind}` at `logins/ipc.ts:199-201`, is a LOG rather than a surface and stays as it is: its `says` is now the fixed sentence, so the log line's `kind` and the sentence it would print agree |

**What the attack did not move.** Section 1's measurement, the choice of candidate (a), the cap's value
and its 96 bytes of margin, `CredentialTooLarge` living in `swap.ts`, the three-edit shape of `liftStore`
(edit 2 is finding 3's loss and is unchanged), the rule that nothing under the cap moves, and every name
in section 2 except the five the section's own preamble lists.

---

## 10. For the main session, and the two lines the operator is asked to rule on

1. **The one thing to put to him BEFORE the build** (it is one line, and the answer changes one arm):
   on his Mac, finishing a codex sign in on a login will add one sentence to the toast that already says
   "Signed in on X." — `This sign in is too large for Tortie to keep in the keychain, so it cannot be put
   back later.` It is true (his codex credential is 4,193 bytes and has never fit, finding 4), it is
   transient, and it is the only place the observe path says anything. If he wants it out, the deletion is
   one arm in `loginSignInDoneLine`, one clause of rule 19, one test case and section 6 row 20, and
   nothing else depends on it. **Nothing else about codex changes**: after the attack no codex row and no
   default row draws a label (problem 5), so the first pass's "every codex row will start saying too
   large" is no longer true and must not be relayed.
2. **Relay after landing, in his terms**: choosing a login while a default Claude session runs over a
   sign in with many MCP servers no longer moves that running session, because moving it destroyed his own
   sign in (finding 3, section 6 row 14), and `Restart now` still moves it; and a login whose own store
   has grown past the cap can be chosen again at all, which it could not be before (finding 6, row 19).
3. **Queue for his ruling, not here**: a file vault for a credential too large for one line (section 7,
   and it is the only fix that makes his real codex account keepable), and the same default lift loss for
   refusals other than size.
4. **Run order**: the parent `probe:p211` (section 5.3) first, then HEAD, both with the scratch `HOME`
   default and neither with `P211_REAL_HOME`; `npm test`, the build, the smokes and the full battery;
   `conformance:credentials` and `conformance:logins`, which the path table in CLAUDE.md names for every
   file this phase touches.
5. **Record at landing**: section 1.5's correction of Phase 281.1's 4,097 (in the Phase 281.1 entry and
   `build/p281/SPEC.md` §8.2, and the attacker's own second measurement agrees with it), and the entry's
   "under a quarter of the cap", which finding 4 refutes for codex.
6. **The verifier's independent methods are named in the header**, and the attack above is what a second
   round must not repeat: re-derive the buffer with a shape neither run used, drive L2, L3 and L6 over real
   `security` on a scratch keychain, and measure the parent with the extended app run.

---

## 11. As built (the integrator's round, 2026-09-19)

The four builders' halves reconciled with **no edit needed at any seam**. Every file in the change set is
one section 8 names, plus this spec and `CHANGELOG.md`. Nothing was widened.

### What the integrator read against sections 2 and 3

- **Every `-i` caller is behind the byte cap.** `securityLineFits` has exactly one definition and two call
  sites (`security.ts:251`, the runner, and `:453`, `keychainWrite`), which are the only comparisons
  against the cap in the tree. `'-i'` appears in `security.ts` alone, three times, as section 3 says.
  The identifier `SECURITY_LINE_MAX` without `_BYTES` survives in **no file under `src/`**; its nine
  remaining mentions are the two gate regexes that forbid it and prose in this spec, `build/p281/SPEC.md`
  and the backlog.
- **The reason reaches the observe.** `captureReading` spreads `tooLarge: true` on the refused branch only
  for `write.why === 'too-large'`; `factsFromSlot` answers `false` with the comment saying it attempts no
  write; `wholeList` carries `kept.tooLarge`; `listLoginsAsking` carries `own.tooLarge` and
  `facts.tooLarge`, and both fallbacks answer `false`.
- **The four strings are byte for byte section 2.3's table**, re-derived independently: 28, 93, 127 and 93
  bytes, `Buffer.byteLength === .length` for each, and the four sha256 prefixes `b09299a582f2becf`,
  `41869426fe67ca49`, `2a80f0caccda7c9c` and `421303ed322eb6b2` recomputed from the spec's own text and
  matched against the shipped constants.
- **`liftStore`'s three edits and `activateLogin`'s two are section 2.4's shape exactly**, and every gate
  anchor the section pins is still byte for byte. The one line that MOVED is
  `const same = chosen !== undefined && sameAccountProven(chosen, live);`, hoisted above the `refused`
  branch so both arms can read it; `sameAccountProven` (`keep.ts:652`) is pure and cannot throw, so the
  hoist changes nothing for a capture that was not refused.
- **The L6 contradiction between clause (g2) and section 2.4 is resolved the same way by both builders**,
  to section 2.4: with no default session live the answer carries **no** `why`. Read in the code: the
  `evidence.sessions.some(` block is not entered, `firstWhy` stays null, and the `!wrote` arm answers
  today's `{ ok: true, wrote: false, says: 'That account is already in place.' }`.

### The under-cap line, DRIVEN rather than diffed (the integrator's independent method)

A driver in the integrator's scratchpad extracted the PARENT's own `const command = ...` template out of
`git show a4f44588:src/main/credentials/security.ts`, composed the expected line from that text, and drove
the shipping `keychainWrite` and `defaultSecurityRunner` over a recording fake and a `/bin/sh` program of
its own. No `/usr/bin/security` ran and no keychain was opened. **17 of 17 readings passed:**

- `keychainWrite` answered true, called its runner once with `['-i']`, and the stdin it sent is the parent's
  line **byte for byte**, same byte count, and it fits the cap.
- the shipping runner under the cap spawned the program and sent
  `<command> "<keychain path>"\n`, the keychain last, and **counted the call**.
- over the cap it rejected `CredentialTooLarge` with `why === 'too-large'`, a message carrying no digit and
  no byte of the payload, the runner **never called**, and **nothing counted**.
- the UTF-16 hole is closed: a scratch path of 50 accented letters composed a line of **4,000 UTF-16 units
  and 4,050 bytes**, which the old `.length` cap would have passed, and the byte cap answered
  `{ code: 1, stdout: '', tooLong: true }` without counting it.

### Commands the integrator ran, all in the worktree

| Command | Exit | Numbers |
| --- | --- | --- |
| `git status --short` | 0 | section 8's files plus `build/p287/SPEC.md`; `build/vendor` also shows untracked, which is the worktree's SYMLINK to the operator's checkout — `.gitignore` names `build/vendor/` with a trailing slash, which matches a directory and not a link, so it is a setup artefact and not a builder's file |
| `npm run -s typecheck` | 0 | 1314 production files, 7382 imports, 0 violations; 4480 runtime edges, 0 strongly connected components |
| `vitest run --no-cache src/main/credentials` | 0 | 11 files, 150 tests |
| `vitest run --no-cache src/main/logins src/renderer/state/__tests__` | 0 | 38 files, 498 tests |
| `vitest run --no-cache src/renderer/app/__tests__ src/shared` | 0 | 92 files, 1526 tests |
| `npm run -s conformance:credentials` | 0 | the cap is 4000 bytes, declared once, compared once in bytes, the program in 3 files and `-i` in 1; 4100 bytes of 4000 units refused, 0 counted, 0 spawned; six paths say the one sentence; **78 of 78 ablations went red** |
| `npm run -s conformance:logins` | 0 | the row carries `tooLarge` from the ask and false from every reader that cannot know, the label drawn on 1 of 8 combinations, 6 of 6 choose-reason fixtures, the sentence in the words file alone; **28 of 28 ablations went red**; shipping sources sha256 `9ca0e6d74726` before and after |
| `node build/assert-hermetic-checks.mjs` (`gate:checks`) | 0 | — |
| `node build/assert-electron-teardown.mjs` (`gate:electron`) | 0 | 435 files read, 144 reach the helper against a floor of 144, unmoved |
| `node build/assert-background-teardown.mjs` (`gate:background`) | 0 | 437 files read, 2 start a process they do not wait for and both end it in a `finally` |
| `node build/assert-known-hosts-scoped.mjs` (`gate:knownhosts`) | 0 | — |
| `node build/contract-inventory.mjs --check` (`gate:contract`) | 0 | matches the baseline byte for byte. **Obligation 3 does not apply**: the baseline names the four `logins:*` channels and no field shapes, so `LoginRow.tooLarge` and `LoginActionResult.why` move no line |
| `node build/probe-p211-switch.mjs --self-test` | 0 | 53 of 53 fixtures graded as intended |
| the under-cap driver above | 0 | 17 of 17 readings |

### What the integrator did NOT run, by instruction

`npm test`, `npm run build`, every smoke, `probe:p211` itself and the full battery. No Electron was
started, the `-L gmux` tmux server was not touched, and `security` was not run at all.

### Two things recorded for the verifiers, neither of them changed

1. **The L6 idle arm posts the ORDINARY switched toast when a session already runs under the chosen
   login.** It follows from section 2.4's ruling: with no default session the answer carries no `why`, so
   `choose` falls through to the switched listener, and `sessionsReachedBySwitch` counts a session on the
   CHOSEN login as reached. The sentence is true — the choice was recorded — and it is what any ordinary
   re-choose of an in-place login says today, so it is not a regression; it is simply the one shape where
   nothing says "too large".
2. **`why` rides the `!result.ok` arm of the choose handler too.** If the activation met the refusal and
   then `chooseLogin` itself failed to record the choice, the answer carries the kept-file failure's
   sentence in `reason` and `why: 'too-large'` beside it, so `problem` reads the real failure (as today)
   while one error toast says the too-large sentence. That is section 2.5's instruction followed
   literally; the arm needs a write of the kept file to fail, it predates this phase in every other
   respect, and narrowing it would widen the change.

---

## 12. Landed inside Phase 304 (2026-09-21): what this spec's copy became

This phase was pulled from 0.109.0 and lands in Phase 304's commit, because its verify and its reverify
both found the same thing: the three sentences of section 2.3 cannot all be true while TWO stores can
refuse a credential for its size. On the arm the reverifier built, Tortie's own vault KEPT a 1,940 byte
sign in (`kept: true`, `restores: true`, `tooLarge: false`, the row promising "Puts this account back.")
and the click then refused with "This sign in is too large for Tortie to keep in the keychain" — Tortie
had kept it; the VENDOR's item was what could not take the line. Phase 304 removes the case rather than
rewording the sentence: Tortie's own vault becomes a `safeStorage`-sealed file with no size limit, so the
only store left that can refuse for size is the agent's own keychain entry, and one sentence can name it.

**Section 2.3's table stays as written, as the record of what was built and measured; this section is
what shipped.** The row-label family died whole because every `tooLarge` fact on a row originated in the
VAULT write's refusal: `LOGIN_TOO_LARGE`, `LOGIN_TOO_LARGE_SIGNED_IN`, `loginDrawsTooLarge`,
`LoginRow.tooLarge`, `defaultLoginRow`'s fifth parameter, `LoginFactsAsk`'s `tooLarge`, `wholeList`'s
`tooLarge`, `P202LoginRow.tooLarge`, the label push in `loginAccountDetail`, the suppression in
`loginSwitchLine`, the tail of `loginSignInDoneLine`, `KeptFacts.tooLarge`, `Capture.why`, `Promotion.why`
and the vault-refusal arms of `liftStore`. What survives is the refusal path and its two toasts, because
the vendor's item still has a ceiling of about 1,954 bytes and finding 6 measured a claude login at 2,158:
`LoginRefusalWhy`, `LoginActionResult.why`, `SwapResult.why`, `CredentialTooLarge`, `securityLineFits`,
`SECURITY_LINE_MAX_BYTES`, `ActivateResult.why` on both arms, `firstWhy` and the `!wrote` arm of
`activateLogin`, the `done.why` passthrough, `act`'s `{ ok, why }`, `choose`'s one-toast rule,
`sayLoginTooLarge` and `LoginTooLargeOutcome`, `P202Reading.problem`, and the `security` scratch-`HOME`
discipline of section 2.6.

### 12.1 The two sentences that survive, rewritten

| Constant | Exact bytes | Bytes | sha256, first 16 |
| --- | --- | --- | --- |
| `LOGIN_TOO_LARGE_SENTENCE` | `This sign in is too large for Tortie to write into the keychain entry the agent reads, so nothing was put back.` | 111, ASCII | `123ddf8f842d3fa7` |
| `LOGIN_TOO_LARGE_RUNNING` | `Switched for new sessions. This sign in is too large for Tortie to write into the keychain entry the running session reads, so that session keeps its current sign in.` | 166, ASCII | `fc94a671cccfc47f` |

Both lengths are `Buffer.byteLength` and `.length` alike; the digests were computed with `node -e` over the
exact bytes. Pinned in `src/renderer/state/__tests__/p287-too-large-say.test.ts` (bytes and digests) and in
`build/probe-p211-switch.mjs` (bytes). Neither holds an apostrophe, because both conformance gates read
the sentence out of `login-copy.ts` with `'([^']*)'`, and both pass every `p181-usage-copy.test.ts` rule.

**Why "for Tortie to write into the keychain entry the agent reads", and not the two drafts before it.**
"For Tortie to keep in the keychain" was this spec's sentence and it blamed the wrong store, above. Phase
304's spec §4.1 then drafted "for the agent to hold in the keychain", which is false the other way: the
agent's own writer switches to an argv form above 4,032 bytes (section 0, finding 2 of the entry), so
the agent holds sign ins of this size every day, and on the switch that stood the agent's per-login entry
holds this very sign in. The ceiling is Tortie's writer, one `security -i` line, and the sentence says
so, naming the entry it could not write. "So nothing was put back" replaces "so nothing was written over
the sign in that is there": after 304 the refusal is said for one click, a kept login chosen while the
agent's entry for it cannot take the sign in, and on that click the row promised "Puts this account back."
and nothing was, which is the clause that is true whether the login's own store was empty (the common
arm) or held an older copy. RUNNING says "This sign in", not "A sign in", because after 304 it is said in
ONE shape, where the too-large sign in IS the chosen one.

### 12.2 `probe:p211`, the arm re-specified for a vault that keeps everything

Steps 1 to 5 unchanged. Step 6: `BIG4` (4,193 bytes) into the default codex store; both builds promote
`three.example`; HEAD reads `kept/codex.default.cred` present, a regular 0600 file whose sha256 is not
`BIG4`'s, holding no `P287-` window, opening on Chromium's `v10` seal prefix; parent absent. Step 8: choose
`two.example` with the default session live; on BOTH builds the default store then holds `two` (the lift
reached the session) and the switched toast is posted; at HEAD a row `four.example` exists `kept: true,
restores: true`, and step 8b chooses it and reads its own `auth.json` sha256 equal to `BIG4`'s; at the
parent no such row and `BIG4` exists nowhere, the loss. Step 9: `BIG5` into `one.example`'s store; HEAD
chooses it in place with no toast; the parent refuses, and the row promised "Puts this account back."
about that click. Step 10: `BIG6` over `two.example`'s store; HEAD in place, chosen false, `restores:
false`, the click answered; parent chosen TRUE (step 9's click was refused, so the choice never moved)
and `restores: false`, because a chosen row promises nothing, and the click refused for ever — Phase
304's spec §5.6 said the parent's row here reads `restores: true`, and it does not; section 5.3's step
10 of this spec and the parent's own 31 of 31 already said the promise sits on step 9's unchosen row.
Step 11: no item
whose payload is any of the three (both), no `Tortie-credentials-*` item at all (HEAD), every sealed file
sealed. Neither too-large sentence appears on either build in this arm: a codex store is a file and never
meets the one refusal that survives. Every `problem` reading is graded, never waited on.
