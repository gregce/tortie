# Phase 304 — Tortie's own vault is a sealed file, not a keychain item (and Phase 287 lands inside it)

Written 2026-09-21 against `/private/tmp/wt-p304` at `dc226df6` with Phase 287's 29 files staged. Every
`file:line` below was read in THAT tree. Where this spec and the Phase 304 entry (`docs/BACKLOG.md:32116`)
disagree, the entry wins unless this file says in as many words why it cannot, and §8 lists every such place.

## §1 The subject, the shape of the one commit

- **Subject.** `fix(credentials): Tortie's own vault is a sealed file, not a keychain item`
- **First body line.** `Phase 304: a sign in of any size is kept`
- **Semver.** Minor. **Tier 3** (holds his credentials; the migration is the only copy changing hands).
  Three independent methods, one an attack: real data by sha256 at 4,193 bytes and 1 MB; the app killed at
  each migration step with a copy asserted after every kill plus a link planted at the staged name; and the
  parent measured, mandatory because he reported it.
- **The one sentence a person notices.** A sign in of any size is kept, so a Codex sign in works at all — the
  account you sign out of can be offered back, which never once worked, because `~/.codex/auth.json` is
  4,193 bytes and Tortie's own keychain line carried about 1,946.
- **ONE commit carries both phases.** 287's story goes in the body (its verify and reverify found its
  sentence blamed the wrong store; this phase removes the case). **CHANGELOG.md gets TWO items under
  `## Unreleased` → `### Fixed`**, both pointing at this one commit, links added by the follow-up docs commit:
  - 287: `Choosing one of your other sign ins no longer writes over the sign in you were already using, and a login whose sign in has grown too large for the agent's own keychain entry can be chosen again at all. When that entry cannot take a sign in, Tortie says so, and the session running on the other sign in stays where it is until you press Restart now`
  - 304: `A sign in of any size is kept, so a Codex account you sign out of can be offered back, which never once worked. Tortie keeps your sign ins in a sealed file of its own rather than in a keychain entry, and the ones already in the keychain move over on their own the first time they are needed`
  - **The staged 287 item sits under `## 0.109.0` (`CHANGELOG.md:29`), a 3-way-apply artefact. B moves it
    to Unreleased and rewrites it as above** ("too large for it to keep" is no longer true: Tortie keeps it).
- **The two pins.** (1) `build/probe-p211-switch.mjs:273` pins `LOGIN_TOO_LARGE_SENTENCE` at 91 bytes while
  the constant is 116 — `node build/probe-p211-switch.mjs --self-test` THROWS at import today (run, exit 1,
  `LOGIN_TOO_LARGE_SENTENCE in this probe is 116 bytes rather than the spec's 91`). B owns every pin of the
  sentence's bytes and digest (§4). (2) `HELPER_USER_FLOOR` at `build/assert-electron-teardown.mjs:250` is
  145; `probe:p304` reaches `electron-run.mjs`, so C sets **146** here. Phase 300 also sets 146 tonight;
  whichever lands second becomes 147, and the main session does that at commit time.

## §2 File ownership — three builders, no file twice, checked against the tree

`git diff --cached --stat` shows 287's 29 modified files plus `build/p287/`, `p287-too-large.test.ts`,
`p287-too-large-copy.test.ts`, `p287-too-large-say.test.ts` untracked. Every 287 file is owned below.

**What changed from the brief's rough table, and why.** (a) `keep.ts` is A's whole, B touches nothing in
it (its 287 edits are the vault-refusal arms plus the vendor `why` passthrough, one file, one reader). (b)
`src/main/credentials/index.ts` gains the seal seams and a `harnessSeal()` that REFUSES `safeStorage` unless
Chromium's mock keychain is in force (§3.4) — the risk §5.7 names is otherwise every `GMUX_PROBES` launch
reaching his `Tortie Safe Storage` key. (c) `migrate.ts` is "minimally" edited after all: ~10 lines that make
the entry's "swept on a later launch" TRUE (§3.6). (d) A new harness seam `src/main/harness/vault-drive.ts`
and its one install line in `src/main/index.ts` are how `probe:p304` reaches the shipping `vaultPut`/
`vaultGet` at 1 MB inside the app, because the observe's `CREDENTIAL_MAX_BYTES` (`payload.ts:63`, 256 KB)
refuses a 1 MB store before any vault write; the entry did not know this. (e) `build/probe-p208-migrate.mts`
(27 hits of the keychain vault, spawned by `probe-p208-vault.mjs`) and `docs/audits/contract-baseline.txt`
(one new `GMUX_*` name, obligation 3) were missing from the brief. (f) `src/main/logins/__tests__/
p220-activation-truth.test.ts` calls `fileVault` (line 66, 130) and is a logins test → B, over A's fixed
test helper.

| Builder | Files, and nothing else | Task |
| --- | --- | --- |
| **A, the vault** | `src/main/credentials/vault.ts`, `src/main/credentials/index.ts`, `src/main/credentials/migrate.ts`, `src/main/credentials/keep.ts`, `src/main/credentials/nofollow.ts` (if a line is needed; probably none), `src/main/credentials/security.ts` and `stores.ts` and `payload.ts` (COMMENTS ONLY, where a sentence now says something false: `security.ts:442-476`'s "both callers", `stores.ts:283-290`'s "refuses first", `payload.ts:60-62`'s "in a keychain item"), `src/main/index.ts` (ONE line: `installVaultDrive();` beside `installHarnessKeychain();` at `:481`), `src/main/credentials/__tests__/test-seal.ts` (new, the fixed helper), `p208-vault-scope.test.ts`, `p208-migrate.test.ts`, `p220-shutdown.test.ts` (two lines), `p281-stores-address.test.ts` (`:503-541`), `p287-too-large.test.ts` (the half that survives, rewritten), new `p304-sealed-vault.test.ts` | §3 exactly; the keep.ts deletions of §4.3; the tests of §6.1 |
| **B, the copy and the login domain** | `src/shared/login-copy.ts`, `src/shared/logins.ts`, `src/shared/ipc/logins.ts`, `src/main/logins/store.ts`, `src/main/logins/ipc.ts`, `src/renderer/app/p202-logins-drive.ts`, `src/renderer/state/logins.ts`, `src/renderer/state/login-switch.ts`, `src/renderer/state/sessions-slice.ts` (comments), `src/main/logins/__tests__/p203-whole-list.test.ts`, `src/main/logins/__tests__/p220-activation-truth.test.ts`, `src/renderer/app/__tests__/{p202-login-card,p203-account-copy,p204-switch-copy,p287-too-large-copy}.test.ts`, `src/renderer/state/__tests__/{p203-sign-in-watch,p287-too-large-say}.test.ts`, `src/renderer/settings/__tests__/p181-usage-copy.test.ts` (comment), `build/probe-p211-switch.mjs`, `build/p287/SPEC.md` (append §12 only), `CHANGELOG.md` | §4 exactly; the p211 arm of §5.6; the two CHANGELOG items |
| **C, the gates and probes** | `build/conformance-credentials.mjs`, `build/credentials-conformance-probe.mts`, `build/conformance-logins.mjs`, `build/logins-conformance-probe.mts`, `build/probe-p208-vault.mjs`, `build/probe-p208-migrate.mts`, `build/probe-p204-accounts.mjs`, new `build/probe-p304.mjs`, new `src/main/harness/vault-drive.ts`, `package.json` (one script), `build/assert-electron-teardown.mjs` (145 → 146), `build/verification-checks.mjs`, `docs/audits/contract-baseline.txt` (regenerated), `CLAUDE.md` (two table rows) | §5 exactly |

**Order.** A's fixed names (§3.1) and B's two strings (§4.1) exist by name from the start; A writes
`test-seal.ts` FIRST because B's `p220-activation-truth.test.ts` and C's gates import it. Expected mid-build,
NOT defects: `conformance:credentials` reports "found nothing to edit" for ablations anchored on keep.ts arms
that A deletes until C re-anchors (§5.2); `conformance:logins` reports it for the folder-gone ablation until
C re-anchors it to the parent's text (§5.3). C's run over the INTEGRATED tree is the one that counts.

Paths nobody touches: `docs/BACKLOG.md` (the main session's), `build/vendor`, `src/main/usage/**`,
`src/main/harness/keychain-harness.ts`, `src/main/harness/launch-gate.ts`, `src/main/credentials/
{kept,locks,lifecycle,watch,swap,security-print}.ts`, `security.ts` and `stores.ts` beyond comments.

## §3 The vault, as an exact change (builder A)

### 3.1 Fixed names, in `vault.ts`

```ts
export interface VaultSeal { wrap(text: string): string | null; open(blob: string): string | null; }
export interface LegacyVault { get(slot: string): Promise<string | null>; del(slot: string): Promise<boolean>; }
export const NO_LEGACY: LegacyVault = { get: async () => null, del: async () => false };
export function legacyKeychainVault(runner: SecurityRunner, scope: string): LegacyVault;  // get/del by vaultServiceFor(slot, scope), account null; NEVER put
export function sealedVault(dir: string, seal: VaultSeal, legacy: LegacyVault): VaultBackend;
export interface VaultBackend { get(slot): Promise<string|null>; put(slot, payload): Promise<void>; del(slot): Promise<void>; }  // `kind` REMOVED: one backend ships
```

`vault.ts` keeps `DEFAULT_SLOT_ID`, `slotFor`, `isSlotName`, `stagedSlotFor`, `VAULT_SERVICE_PREFIX`,
`vaultScopeDigest`, `vaultServiceFor` (now the LEGACY name composers: read and delete only, and `migrate.ts:70`
still needs the prefix), `vaultTarget`, `vaultPut`, `vaultGet`, `vaultDiscardStaged`, `vaultDel`. It DELETES
`keychainVault`, `fileVault`, `VAULT_ACCOUNT` (the write's `-a`, nothing reads it afterwards) and its import of
`keychainWrite`, so the file names no write to any keychain; `keychainRead`/`keychainDelete` stay for
`legacyKeychainVault` and `createHash` for `vaultScopeDigest`. Header §"THE BACKENDS ARE ONE SEAM" is rewritten: one backend, a sealed
file, the keychain read once. `index.ts` re-exports `sealedVault`, `legacyKeychainVault`, `NO_LEGACY`,
`VaultSeal`, `LegacyVault` and drops `fileVault`, `keychainVault`.

### 3.2 What stands today, quoted

`vault.ts:22-27`: "A keychain item on macOS, named `Tortie-credentials-<slot>-<scope>`, and a file with mode
0600 everywhere else. Both are reached through {@link VaultBackend}". `vault.ts:185-213` is `fileVault`:
`pathOf = join(dir, \`${slot}.cred\`)`; `get` = `readFileSync(pathOf(slot), 'utf8')` (FOLLOWS a link — the entry
moves it to `readTextNoFollowSync`); `put` = `mkdirSync(dir, {recursive: true, mode: 0o700})`, `writing =
\`${path}.writing\``, `writeNoFollowSync(writing, payload)`, `renameNoFollowSync(writing, path)`; `del` =
`rmSync(force)`. `index.ts:266-270`: `keychainIsTheStore() ? keychainVault(defaultSecurityRunner(), root) :
fileVault(join(root, 'kept'))`. `settings/store.ts:791-798`: `sealAvailable()` = `app.isReady() &&
safeStorage.isEncryptionAvailable()` in try/catch; `:806` `safeStorage.encryptString(text).toString('base64')`;
`:827` `safeStorage.decryptString(Buffer.from(blob, 'base64'))`.

### 3.3 `sealedVault(dir, seal, legacy)` — the body

- `pathOf`, `mkdir 0700`, the `<slot>.cred` name, the `<slot>.cred.writing` staged name, `writeNoFollowSync`
  and `renameNoFollowSync` are `fileVault`'s, UNCHANGED, so `nofollow.ts`'s guard covers the shipping write on
  macOS for the first time. No new copy, field, file name or log line.
- **`put(slot, payload)`**: `mkdirSync(dir, …0o700)`; `const sealed = seal.wrap(payload)`; **`if (sealed === null)
  throw new Error('no seal could be made for this entry')`** (names no byte, no length); `writeNoFollowSync(writing,
  sealed)`; `renameNoFollowSync(writing, path)`. The throw travels through `vaultTarget.stage` into `safeSwap`'s
  stage catch (`swap.ts:109`), which answers the sentence it already has: **"Nothing could be written, so
  nothing changed."** The observe pushes a `refused` event as today; nothing else moves.
- **`get(slot)`**:
  1. `const text = readTextNoFollowSync(pathOf(slot))`; if `text !== null && text !== ''`, `const opened =
     seal.open(text)`; **if `opened !== null` return it — a HIT asks `legacy` nothing.** A file that will not
     open (seal unavailable, foreign key, garbage) is treated as a miss, and step 2 can only ADD a copy.
  2. `const held = await legacy.get(slot)` (try/catch → null); `if (held === null) return null`.
  3. `try { await put(slot, held) } catch { return held }` — the seal unavailable: BOTH copies stay, the answer
     is the legacy bytes, nothing is deleted.
  4. read back: `const back = readTextNoFollowSync(pathOf(slot))`; `if (back === null || seal.open(back) !==
     held) return held` — never a delete on a read-back that disagrees.
  5. `await legacy.del(slot)` (result ignored here; §3.6 is the sweep); `return held`.
- **`del(slot)`**: `rmSync(pathOf(slot), {force: true})` in try/catch; then **`if (!slot.endsWith('.pending'))
  await legacy.del(slot)`** (try/catch). The staged name is excluded so `safeSwap`'s `finally` discard
  (`vault.ts:223`) spawns NOTHING; a removed login (`vaultDel`, `vault.ts:292`) still clears a legacy item, which
  rule 16 requires. `vaultDiscardStaged`'s `get(staged)` on a miss reaches `legacy` and, if a pre-304 scoped
  staged leftover exists, migrates it into `<slot>.pending.cred` and the sweep then removes that file — the
  leftover is gone either way.
- `vaultGet`'s `isSlotName` guard, `vaultPut`'s, `vaultTarget` and `safeSwap`'s three steps are untouched.

### 3.4 `index.ts` — the seal seam, the legacy arm, the ONLY file naming Electron

```ts
const NO_SEAL: VaultSeal = { wrap: () => null, open: () => null };
function sealAvailable(): boolean { try { return app.isReady() && safeStorage.isEncryptionAvailable(); } catch { return false; } }  // settings/store.ts:792-798 byte for byte
function electronSeal(): VaultSeal {
  return {
    wrap: (text) => { if (!sealAvailable()) return null; try { return safeStorage.encryptString(text).toString('base64'); } catch { return null; } },
    open: (blob) => { if (!sealAvailable()) return null; try { return safeStorage.decryptString(Buffer.from(blob, 'base64')); } catch { return null; } }
  };
}
/** A harness launch seals ONLY under Chromium's mock keychain; otherwise it keeps nothing and never reaches his Safe Storage key. */
function harnessSeal(): VaultSeal { return app.commandLine.hasSwitch('use-mock-keychain') ? electronSeal() : NO_SEAL; }
function defaultVault(root: string): VaultBackend {
  return sealedVault(join(root, 'kept'), electronSeal(), keychainIsTheStore() ? legacyKeychainVault(defaultSecurityRunner(), root) : NO_LEGACY);
}
```

`harnessFileKeepDeps` → `vault: sealedVault(join(root, 'kept'), harnessSeal(), NO_LEGACY)`;
`harnessKeychainKeepDeps` → `vault: sealedVault(join(root, 'kept'), harnessSeal(), legacyKeychainVault(runner,
root))`, so a probe's scratch keychain is the legacy source the read-through migrates from. The platform
branch that chose a BACKEND is gone; `keychainIsTheStore()` survives because `keychainForClaude`
(`index.ts:119`) and the boot pass need it, and it now decides only whether a keychain exists to read legacy
items from. `readyKeepDeps` (`index.ts:355`): `keychainIsTheStore() && deps.vault.kind === 'keychain'` becomes
`keychainIsTheStore()`, and the `migrateUnscopedVault` call gains `legacy: legacyKeychainVault(deps.stores.runner,
deps.root)` — the same `security` the stores use, as the comment at `:357` already says. Comments at
`index.ts:186-189` (mock keychain) and `:256-265` (two backends) are rewritten.

### 3.5 Where a crash leaves a copy (entry item 4, made exact)

| Killed | Copies left | Next `get` |
| --- | --- | --- |
| before the sealed write | item | miss → read-through again |
| mid `.writing` (partial staged file) | item + partial `.cred.writing` | miss (`.cred` absent) → `writeNoFollowSync` unlinks the partial, rewrites |
| after rename, before read-back | item + sealed file | HIT; the item is a duplicate → §3.6 sweeps it |
| after read-back, before delete | item + sealed file | same |
| `security` refuses the delete | item + sealed file | same |
| after delete | sealed file | hit |
| `seal.wrap` null during the read-through | item (no file written) | miss → read-through again when the seal is back |

No step leaves zero copies. The ordinary `put` (stage → readStaged → commit → discard) leaves at worst
`<slot>.pending.cred`, which rule 14b's sweep removes on the next run, exactly as the file arm today.

### 3.6 `migrate.ts`, minimally: `MigrateDeps.legacy` and the duplicate sweep

`migrate.ts` keeps its header, `unscopedVaultServiceFor` (the SOLE composer of the unscoped name), the profile
proof and every existing arm; its boot pass still works because `vaultPut` now writes the sealed file. TWO
edits: `MigrateDeps` gains `legacy: LegacyVault`, and inside the per-slot loop, after the staged-leftover block
(`:221-226`) and BEFORE `const legacy = unscopedVaultServiceFor(slot)` (`:227`), insert

```ts
    // PHASE 304. A SCOPED ITEM BESIDE A SEALED FILE IS A DUPLICATE the read-through left when a kill or a
    // refused delete fell between its read-back and its delete. A miss below migrates on its own.
    if ((await vaultGet(d.vault, slot)) !== null && (await d.legacy.get(slot)) !== null) {
      if (await d.legacy.del(slot)) out.deleted += 1;
      else out.failed += 1;
    }
```

Cost: one `find-generic-password` per KEPT slot per launch on the own profile, beside the two per slot the
pass already makes; the boot line's `deleted`/`failed` counts carry it. (The local `const legacy` at `:227` is
renamed `old` to avoid shadowing `d.legacy`.)

## §4 The copy and the deletion, name by name (builder B; keep.ts is A's, §4.3)

### 4.1 The two strings that survive, rewritten — the words file `src/shared/login-copy.ts`

After 304 the ONLY store that can refuse for size is the agent's own keychain entry (`stores.ts:292`
`keychainTarget`, reached for Claude on macOS at `:345` and `:395`; codex is a file at `:334` and `:385`). So:

| Constant | Exact bytes | Bytes | sha256 first 16 |
| --- | --- | --- | --- |
| `LOGIN_TOO_LARGE_SENTENCE` | `This sign in is too large for the agent to hold in the keychain, so nothing was written over the sign in that is there.` | 119 | `c65502cbe5a4e90e` |
| `LOGIN_TOO_LARGE_RUNNING` | `Switched for new sessions. This sign in is too large for the agent to hold in the keychain, so the running session keeps its current sign in.` | 141 | `8a9eba68d7702559` |

Both ASCII, `Buffer.byteLength === .length`, computed with `node -e` over the exact bytes; both pass every
`p181-usage-copy.test.ts` rule (no dash, no ` it `/` it.`, no `I`, no `token`/`bearer`, no tmux word) and
neither holds an apostrophe, because both gates read the sentence with `'([^']*)'`. "the agent" is the
vocabulary `settings/usage-copy.ts:74` already uses. The SENTENCE keeps 287's consequence clause because it is
true on every reachable arm (L5a, and the partial's `says` where the default store was not written over); "so
nothing was put back" was refused for the partial. RUNNING says "This" not "A" because after 304 it is said in
ONE shape, L5b, where the too-large sign in IS the chosen one. Where each is read: SENTENCE — the `reason` of
`safeSwap`'s `CredentialTooLarge` catch (`swap.ts:123`, `:153`), so `ok:false` from `activateLogin` (L5a: the
login's own store, empty or superseded, whose vendor stage cannot take the kept payload) and the `problem`
plus the `'refused'` toast; RUNNING — the `'chosen'` toast for L5b (§4.3). **Pins of the bytes and digests**:
`build/probe-p211-switch.mjs:266-280` (drop `TOO_LARGE_LABEL`; 91 → 119; 135 → 141), `p287-too-large-say.test.ts`
(one new `it` pinning both strings' exact bytes and sha256 prefixes, replacing the copy test's pin),
`build/p287/SPEC.md` (a §12 appended, never the §2.3 table rewritten), this file.

### 4.2 What dies, and what survives, by file

| File | Dies | Survives |
| --- | --- | --- |
| `src/shared/login-copy.ts` | `LOGIN_TOO_LARGE` (`:69`), `LOGIN_TOO_LARGE_SIGNED_IN` (`:143`), `loginDrawsTooLarge` (`:206`), the push in `loginAccountDetail` (`:243`), the suppression in `loginSwitchLine` (`:266`), the tail in `loginSignInDoneLine` (`:317` → `return said;`), their comments | the two strings above with rewritten comments; every Phase 203/204/211 function reads byte for byte as at the parent |
| `src/shared/logins.ts` | `LoginRow.tooLarge` (`:266-280`), `defaultLoginRow`'s fifth parameter (`:312`, `:332`) | `LoginRefusalWhy = 'too-large'` (`:48`) |
| `src/shared/ipc/logins.ts` | nothing | `LoginActionResult.why` (`:71`) with its comment rewritten: "a switch can meet the agent's own ceiling and still stand" |
| `src/main/logins/store.ts` | `tooLarge` in the cheap list (`:310`), `LoginFactsAsk` (`:346`), `asked`'s type and both fallbacks (`:381`, `:386-392`, `:414`), the `defaultLoginRow` fifth argument (`:400-407` collapses to the parent's one line), the added row's field (`:428`) | — |
| `src/main/logins/ipc.ts` | `tooLarge: kept.tooLarge` in `wholeList` (`:366-370`) | `why` on both returns of `logins:choose` (`:434`, `:442-447`, `:450`, `:485-489`), the `LoginRefusalWhy` import; the observe log at `:204` (`{provider, kind}`) is untouched |
| `src/renderer/app/p202-logins-drive.ts` | `P202LoginRow.tooLarge` (`:46-50`, `:172`) | `P202Reading.problem` (the probe reads it) |
| `src/renderer/state/logins.ts`, `login-switch.ts`, `sessions-slice.ts` | **0 code lines** (entry §5) | `LoginTooLargeOutcome`, `setLoginTooLargeListener`, `act`'s `{ok, why}`, `choose`'s one-toast rule, `sayLoginTooLarge` both outcomes; comments that say "a sign in Tortie could not keep" become "a sign in the agent's own keychain entry cannot take" |
| tests | `p287-too-large-copy.test.ts` whole; `tooLarge: false` removed from every `LoginRow` literal in `p202-login-card`, `p203-account-copy`, `p204-switch-copy`, `p203-sign-in-watch`, `p203-whole-list` (its two "carry tooLarge from the ask" cases die) | `p287-too-large-say.test.ts` whole, plus the byte pin |
| `build/probe-p211-switch.mjs` | `TOO_LARGE_LABEL`, `gradeTooLarge` and its 5 fixtures, every `tooLarge` reading and wait (`:1174`, `:1253`, `:1309`, `:1325`) | `UNREADABLE` for `problem`, `gradeProblem`, `gradeToastOnce`/`Absent`; the arm is re-specified in §5.6 |

### 4.3 `keep.ts` (builder A) — the entry's table corrected by reading the file

Every `too-large` fact that came from a VAULT put dies; every one that comes from the VENDOR write
(`liftStore`'s `safeSwap(target, …)` at `keep.ts:1500`) survives. Dies: `KeptFacts.tooLarge` (`:138-145`),
`NO_KEPT_FACTS.tooLarge` (`:152`), `Capture.why` (`:466-472`), the refused capture's split (`:516-523` → the
parent's `return { facts, took: 'refused' }`), the mirrored `tooLarge: false` (`:552-553`), `factsFromSlot`'s
field (`:588-591`), `keptFactsFor`'s Phase 287 paragraph (`:940-943`), `Promotion.why` (`:737-742`) and both
spreads (`:800-802`, `:846-847`), `LiftResult`'s `ok: true` `why?` (`:1318`), `liftStore`'s own-store split
(`:1419-1439` → the parent's refusal then `same ? … : signed-into-again`; the hoisted `const same` may stay),
the default arm (`:1448-1465`), the promotion ternary (`:1477-1486` → the parent's one sentence),
`activateLogin`'s `own.why === 'too-large'` skip (`:1162-1175`, the `else` unwrapped to the parent's shape),
and the `LOGIN_TOO_LARGE_SENTENCE` import (`:51`). **Survives**: `ActivateResult.why` both arms (`:965-967`),
`LiftResult`'s `ok: false` `why?`, the `done.why` passthrough (`:1504-1510`), `own.why` on the refusal
(`:1142-1148`), **`firstWhy` (`:1117`, set at `:1191` only)**, the partial's spread (`:1235`), and **the `!wrote`
arm at `:1209-1224`** with its comment rewritten: the login's own store already holds its account so new
sessions under it work, the running default session was not moved because the agent's own keychain entry
cannot take the sign in (`lifted.why`), and the toast says so with Restart now. §8 says why this departs from
the entry's table. About 120 lines deleted here (the entry said ~146).

## §5 The gates and probes (builder C)

### 5.1 `conformance:credentials` rule 22 — NEW, "TORTIE'S OWN VAULT HAS NO SIZE LIMIT"

`VERDICT_PARTS` gains `sealed`; the probe (`credentials-conformance-probe.mts`) gains a `sealed` arm over the
SHIPPING `sealedVault` in a fresh temp dir, an injected seal `{ wrap: t => 'p304:' + base64(t), open: b =>
b.startsWith('p304:') ? decode : null }`, and a recording fake `security` as `legacy`. Driven: (a) `vaultPut` then
`vaultGet` at **4,193, 65,536 and 1,048,576 bytes** of random hex → sha256 of the answer equals sha256 of the
payload, three times; (b) the file `<slot>.cred`'s sha256 differs from the payload's and the file contains no
64-byte window of it; (c) the runner saw ZERO argvs across all six calls; (d) the file mode is 0600 and the
dir 0700; (e) `seal.wrap` answering null → `vaultPut` answers `{ok:false, reason:'Nothing could be written, so
nothing changed.'}` and no `<slot>.cred` exists after; (f) a `get` HIT sends zero argvs. Scanned (tree AND every
ablated copy): `vault.ts` names neither `keychainWrite` nor `'-i'`; `keychainWrite` has exactly ONE non-test
caller under `src/main/credentials`, in `stores.ts`'s `keychainTarget`. Ablations over sibling copies, both
must move `sealed`: **(i) the seal dropped** — `writeNoFollowSync(writing, sealed)` → `writeNoFollowSync(writing,
payload)` in `put` (b goes red); **(ii) a cap reintroduced** — `if (Buffer.byteLength(payload, 'utf8') > 4_000)
throw new Error('too large');` inserted at the top of `put` (a goes red at 4,193).

### 5.2 Rule 17 rewritten, rule 21 narrowed, the twelve ablations

**Rule 17, "THE VAULT IS ONE SEALED FILE, AND THE KEYCHAIN IS READ ONCE".** Kept, over `vaultServiceFor` as
the LEGACY composer: `differ`, `neverUnscoped`, `digestRederived`, `emptyScopeThrows`, `composerAgrees`
(§8 says why the entry's "give way" is loosened: the read-through still composes a scoped name and must never
reach another profile's item). Rewritten: `backendNamesScoped` → the read-through asks exactly
`vaultServiceFor(slot, root)` and nothing else; `crossProfileHidden` → profile B's `get` over A's planted
item answers null and writes no file. NEW read-through arms over `sealedVault(dir, injectedSeal,
legacyKeychainVault(sec.runner, root))`: (a) a miss with a scoped item planted → file written, read back,
item deleted, answer byte-equal, argvs exactly `[find -s <scoped> -w, delete -s <scoped>]`; (b) the delete
refused (runner answers 1 to delete) → answer byte-equal, item AND file present, and a second `get` sends
zero argvs; (c) `wrap` null during the read-through → answer is the legacy bytes, NO file, NO delete
(argvs exactly `[find]`); (d) `open` answering other bytes on the read-back → no delete; (e) the boot sweep:
a sealed file plus a scoped duplicate → `migrateUnscopedVault` deletes it and counts `deleted: 1`. Migration
arms `presentMoved`, `absentUntouched`, `refusedNamesNothing`, `recordedOldRewritten`, `stagedResidueDeleted`,
`presentNamedUnscoped`, `badReadbackKept`, 17b, 17c: kept, driven over the sealed vault (they pass `legacy`
now, `probe.mts:3065-3071`). The probe's `makeVault()` (`:404-411`) drops `kind: 'file'`; `:2191`'s
`vault.fileVault(vaultDir)` becomes `vault.sealedVault(vaultDir, injectedSeal, vault.NO_LEGACY)` and the
rule 15 link fixture at `:2189` is unchanged.

**Rule 21 narrowed to the vendor arm.** Clauses (a)–(f) unchanged. (g) loses the vault refusal, the
observe, L2, L3 (both), L6 (three readings) and their `lineCap` fields; **L5 is rewritten**: a claude login
kept in the sealed vault (injected seal) with a 1,940-byte payload and a 60-character vendor account →
`activateLogin` answers `{ok:false, reason: SENTENCE, why:'too-large'}`, no item added, the sealed copy
intact. **NEW (g′) L5b**: the same login whose own store ALREADY holds the payload, a default session live,
the default item small → `{ok:true, wrote:false, why:'too-large'}`, the default item byte-identical, the
outgoing default account promoted, the chosen name recorded; its control with NO default session → `ok:true`,
no `why`. (h) unchanged (the vendor's two lines; Tortie's own store sends none). The `says(...)` reads the
sentence from `login-copy.ts` as today (`:1998`). Ablations 1–5 and 9 (`security.ts`, `swap.ts`) stay
byte for byte; **10 stays** (`if (firstWhy === 'too-large') {` still exists, now driven by (g′)); **6, 7, 8, 11,
12 are removed**, because their `from` text is deleted by A; the orca ablation stays. Ablation count moves
78 → 75 (−5 +2 for rule 22).

### 5.3 `conformance:logins` rule 19 keeps `why`, loses `tooLarge`

Driven half: the `tooLarge` arm of `logins-conformance-probe.mts` (`VERDICT_PARTS` `tooLarge`, `:1088`)
is removed whole. Scanned half kept: the choose handler read by matching braces carries `why` on the refusal
and on BOTH answered arms (`:1498-1605`, the six fixtures unchanged); the sentence's bytes appear in
`login-copy.ts` alone; **`swap.ts` names the constant and `keep.ts` no longer does** (`:1624` loop narrowed
to `['swap.ts']`). Ablations: "the refused choice carries no named reason" stays; "the default row is not
told" and "a finished sign in no longer says" are removed; **"a login whose folder is gone asked about anyway"
(`:1756-1768`) is re-anchored to the parent's text** `: { present: false, email: null, kept: false, restores:
false };`. Count 28 → 26.

### 5.4 The two rewritten probes

- `build/probe-p208-vault.mjs`: args gain `--use-mock-keychain` (as `probe-p211-switch.mjs` since 287);
  reading 1 becomes: the planted default claude credential is kept in `<profile>/gmux/logins/kept/
  claude.default.cred`, a real file, mode 0600, whose sha256 is not the plant's and which holds no window of
  it; the scratch keychain holds **no `Tortie-credentials-*` item at all** after the run (the unscoped plant
  at `:393` is dropped — the boot pass refuses harness profiles, so it proved only the refusal; the reading
  "migrationRefused" stays); reading 3 runs `probe-p208-migrate.mts` rewritten over `sealedVault(dir,
  injectedSeal, legacyKeychainVault(runner, root))` with the REAL `security` on the scratch file; reading 5
  (his keychain by attributes, `dump-keychain` with no `-d`) stays as it is. Its `-w` guard and `finally`
  are untouched. FIX ROUND: his two credential files are read by `lstat` alone (size, mtime, inode, or
  absent), graded by `gradeFileIdentity` under `--self-test`, and the log prints the triple, never a digest;
  `hashFile` over `/usr/bin/shasum` is gone.
- `build/probe-p204-accounts.mjs`: `tortieItemsNamed()` (`:196-203`) fingerprints, by attributes, the
  SCOPED names this run's profile would compose (`Tortie-credentials-<slot>-<sha256(loginsRoot)[0:8]>` for
  both default slots) before and after → 'none' both; plus the sealed files exist under the profile after.
  FIX ROUND: `hashOf` over `~/.codex/auth.json` and `~/.claude.json` is `identityOf`, the same `lstat`
  triple, compared as a triple; the keychain fingerprint stays, being attributes only.

### 5.5 `build/probe-p304.mjs` — declared as `"probe:p304": "npm run build && node build/harness-socket.mjs --fresh gmux-p304 'node build/probe-p304.mjs'"`

One scratch profile under the harness dir, one scratch `HOME` (the p287 pattern: `default-keychain` must
answer "could not be found" before anything is created and again at the end; every `security` call under
that `HOME`; his two credential files by `lstat` only), one scratch keychain (`create-keychain`, never in the
search list, `delete-keychain` in a `finally`), `GMUX_PROBES=1`, `GMUX_HARNESS_KEYCHAIN=<file>`, `CODEX_HOME`
and `CLAUDE_CONFIG_DIR` at directories it made, args `['--remote-debugging-port=0', '--use-mock-keychain']`,
every launch through `withElectron` with `graceMs 15_000`, `ceilingMs 240_000`. **Four launches, one at a
time, never beside another.** `P304_PARENT_CHECKOUT` (the `P211_PARENT_CHECKOUT` pattern) points the same
readings at `/private/tmp/wt-p299`. Compare by sha256 and length ONLY; no payload byte in the log or the
report.

1. **The size arm (launch 4, the clean one).** `GMUX_HARNESS_VAULT_DRIVE=<dir under the harness dir>` holding
   `a.payload` (4,193 bytes of random hex) and `b.payload` (1,048,576 bytes). `src/main/harness/vault-drive.ts`
   (new, C): under the three refusals `keychain-harness.ts:20-26` carries plus the dir inside the harness dir,
   after `readyKeepDeps()`, for each `*.payload`: `vaultPut(deps.vault, slotFor('codex', <16 hex from the
   name>), text)` then `vaultGet`, printing ONE line `[gmux] vault-drive <name> put=<ok|refused> bytes=<n>
   sha256=<hex of the answer>`; `installVaultDrive()` is the one line A adds at `src/main/index.ts:481`. The
   probe grades sha256 equal for both, reads the two `.cred` files (exist, 0600, sha256 ≠ payload, no
   64-byte window of it, the base64 decodes to bytes beginning `v10` — Chromium's own seal prefix), and
   reads `securityCallCount` off the boot line unmoved by the drive. Same launch: **the observe arm** — a codex
   login whose `auth.json` is a 4,193-byte synthetic credential (sentinel `P304-`) reads `kept: true,
   restores: false` in the list (the shipping `vaultGet` agreed by digest); then choose the default and choose
   the login back: its `auth.json` sha256 equals the plant's (the vault's answer written back byte exact).
   **Parent:** `kept: false`, no `.cred`, the scratch keychain holds zero `Tortie-credentials-codex*` items;
   the drive prints nothing (the seam is absent) and is graded `unreadable, the build predates the seam`.
   Same launch: **the hostile links** — before launch, symlinks at `kept/<slot>.cred.writing` AND
   `kept/<slot>.pending.cred.writing` pointing at a stand-in for `~/.codex/auth.json` under the scratch dir;
   after the observe the stand-in's sha256 is unchanged, `<slot>.cred` is a regular file, and the links are
   gone (unlinked by `writeNoFollowSync`).
2. **The migration arm (launches 1–3), over the scratch keychain.** Three codex logins in `logins.json`
   with `.kept.json` records (format: `kept.ts:86-87`, `{v: 1, slots: {<slot>: {email, subject, digest, account,
   from, at, superseded}}}`), and three scoped items planted with `security -i` (`probe-p208-vault.mjs:334`
   shape) under `Tortie-credentials-<slot>-<sha256(<profile>/gmux/logins)[0:8]>`, account `tortie`. The drive
   dir holds a `stop` file naming `<step>:<slot>` — `vault-drive.ts` wraps the seams the harness already hands
   in: `before-write` = `legacy.get` of that slot kills the process (`process.kill(process.pid, 'SIGKILL')`)
   before returning; `before-readback` = the first `seal.open` after a `wrap` for that slot kills;
   `before-delete` = `legacy.del` of that slot kills before deleting. After every kill, from OUTSIDE: the item
   still there (`find-generic-password -s <name> <file>`, attributes) and the file present or absent as
   §3.5's table says, so a copy exists every time. Launch 4 then reads all three rows `kept: true`, the three
   `.cred` files present, and **zero `Tortie-credentials-*` items in the scratch keychain** — every item moved
   once, in the safe order. The boot line's `migration.refused` is true (harness) both builds.
3. **The Safe Storage guard (§5.7)**, before launch 1 and after launch 4.

Graders and `--self-test` fixtures in the file's existing shape; `build/verification-checks.mjs` gains
`electron('probe:p304')` with a comment saying the above, and the `probe:p211`/`probe:p208` comments say what
their arms now drive. `docs/audits/contract-baseline.txt` is regenerated (`node build/contract-inventory.mjs
--out …`) for the ONE new name `GMUX_HARNESS_VAULT_DRIVE`; the commit body names the line.

### 5.6 `probe:p211`, 287's arm re-specified for a vault that keeps everything (builder B)

Steps 1–5 unchanged. 6: `BIG4` (4,193 bytes, account `four`) into the default codex store; wait for
`three.example` (both builds); HEAD reads `kept/codex.default.cred` present and not `BIG4` by sha256, parent
absent; the scratch keychain holds no `Tortie-credentials-codex*` item (both). 7 unchanged. 8: choose
`two.example` with the default session live — **HEAD: the default store holds `two` (the lift reached the
session) AND a new row for account `four` exists with `kept: true, restores: true`; then choose that row:
its own `auth.json` sha256 equals `BIG4`'s** (the sealed vault's answer written back); the switched line for
`two.example` PRESENT and no too-large toast; `problem` null. Parent: the default store holds `two` and `BIG4`
exists nowhere (the loss). 9: `BIG5` into `one.example`'s store; wait for `one.example 2`; choose
`one.example` — HEAD: no refusal, no toast, the store still `BIG5`, `problem` null; parent: refused with its
own sentence (stderr under `P211_ECHO=1`), store still `BIG5`. 10: `BIG6` (account `two`) over `two.example`'s
store; choose `two.example` — HEAD: in place, no toast, the row's detail carries no label and no switch line;
parent: `restores: true` and "Puts this account back.", no toast. 11: the scratch keychain holds no item
whose payload digest is any of the three (both) and **no `Tortie-credentials-*` item at all (HEAD)**; HEAD's
three `.cred` files hold no `P287-` window. Every `problem` reading stays graded, never waited on.

### 5.7 The one risk the entry does not name, and the probe's two guards

The real `safeStorage` on macOS reads the `Tortie Safe Storage` key from his LOGIN keychain, with a
Chromium-created item and an ACL that may PROMPT for a dev Electron; under a scratch `HOME` with no default
keychain it pops "A keychain cannot be found to store …" and WAITS (`src/main/index.ts:182-193`, the
2026-08-16 incident). So `probe:p304` runs the REAL `safeStorage` API of a real Electron over Chromium's
**mock keychain** (`--use-mock-keychain`, the switch `probe-p211-switch.mjs` and five other probes pass), which
is what `harnessSeal()` requires; the `v10` prefix reading proves the real OSCrypt path ran. Guards: (1)
BEFORE and AFTER, `security find-generic-password -s "Tortie Safe Storage"` (attributes only, never `-g`/`-w`,
under his real `HOME`, exit code and item count only, output never printed) answers the same count — the
ONE `security` call in this probe aimed at his search list, and it is the brief's own ask; (2) the drive line
carries `seal=<available|unavailable>` from `safeStorage.isEncryptionAvailable()`, and the probe FAILS (not
hangs) on `unavailable`, with a 90 s deadline on every `waitForLine`. What the mock key does not prove: that
his real item's ACL admits the packaged app — `settings/store.ts` proves that on every launch that opens a
danger seal, and it is not new.

### 5.8 CLAUDE.md's two rows (C)

`conformance:credentials`: keep "~40 s, opens no keychain"; append "Since Phase 304 Tortie's own vault is ONE
backend on every platform, a `safeStorage`-sealed file under `<userData>/gmux/logins/kept/`, driven here over
an injected seal: rule 22 round-trips 4,193 bytes, 64 KB and 1 MB byte exact by sha256 with the file's bytes
never the payload and no `security` argv on a put, and rule 17 is the read-once legacy arm, a keychain item
read through on a miss, written sealed, read back and only then deleted, with a kill or a refused delete at
any step leaving at least one copy, and the boot pass sweeping a duplicate". `conformance:logins`: append
"Since Phase 304 rule 19 keeps the named reason a refused switch carries out of `logins:choose` on both arms
and no row carries a size, because the only store that can refuse for size is the agent's own keychain
entry". The entry's item 7 says the logins row "must stop implying a size can reach a row" — it never did
(287 left CLAUDE.md alone), so this is an addition.

## §6 The proof, and the no-regression table

### 6.1 Tests, red at the parent (A unless said)

`p304-sealed-vault.test.ts` (new): round trip at 4,193 / 65,536 / 1,048,576 bytes by sha256 through
`vaultPut`/`vaultGet` over `testSeal()`; file ≠ payload; `wrap` null → the sentence and no file; `get` follows
no link (a link at `<slot>.cred` reads as absent); the read-through's five steps and §3.5's seven rows over a
`LegacyVault` fake that can refuse `del` and a seal that can refuse once; `del` of a staged name asks legacy
nothing, `del` of a slot asks it once; `readyKeepDeps`-shaped boot pass sweeps a duplicate (`migrate.ts`).
`test-seal.ts` exports `testSeal(): VaultSeal` (base64 with a marker) and `recordingLegacy(items)`.
`p208-vault-scope.test.ts`: the five name cases stay; `:125-150` become the read-through (scoped name only,
another profile blind); `:151` (account) dies. `p208-migrate.test.ts`: every arm over `sealedVault` + fake
legacy, plus the sweep. `p281-stores-address.test.ts:524-540`: "the legacy arm sends the service-only argvs
and never `-i`". `p287-too-large.test.ts`: L5a and NEW L5b survive over the sealed vault; V1, the observe, L2,
L3, L4, L6 and "nothing under the cap moves" die (its replacement: Tortie's own store sends zero `-i` lines
and the vendor's two are `p281-stores-address.test.ts`'s). B: `p287-too-large-say.test.ts` + the byte pin;
`p203-whole-list.test.ts` without `tooLarge`; `p220-activation-truth.test.ts` over `sealedVault(…, testSeal(),
NO_LEGACY)`.

### 6.2 Gates and commands (every builder, every command under 90 s)

`npm run -s typecheck`; targeted `npx vitest run --no-cache <path>`; `node build/conformance-credentials.mjs`
(~46 s); `node build/conformance-logins.mjs` (~13 s); `node build/probe-p211-switch.mjs --self-test` (B) and
`node build/probe-p304.mjs --self-test` (C). `npm run build`, `npm test`, smokes, the probes and the two
parent runs are the MAIN SESSION's and the verifiers', under the Electron lock. `gate:contract` will be RED
until C regenerates the baseline, by design.

### 6.3 The operator's no-regression table — today = `/private/tmp/wt-p299` (`b6f04ab0`, built, neither phase)

| # | Scenario | Driven by | Today | HEAD | Worse? |
| --- | --- | --- | --- | --- | --- |
| 1 | observe a claude store unchanged | gate rule 1; p211 step 1 | `unchanged`, no write | same; `get` hits the sealed file, zero `security` | no |
| 2 | observe one that changed (token refresh) | gate rule 1 | kept via keychain `-i` (2 lines) | kept via the sealed file (0 lines) | no |
| 3 | account changed → login minted | gate rule 1, 13; p211 step 2 | promoted, row appears | same | no |
| 4 | choose a login with no session | gate rule 2; p211 step 3 idle | own store written | same; the vendor lines byte for byte (rule 21 h) | no |
| 5 | choose with a default session live | gate rule 2; p211 step 3 | default lift, both written | same | no |
| 6 | choose the default | p287-say test; p211 | "Your own sign in is used as it is." | same | no |
| 7 | add a login | logins gate | as today | same | no |
| 8 | remove a login, all four stores | gate rule 16 | item, slot, staged, record cleared | file, staged file, legacy item, record cleared | no |
| 9 | an interrupted write stopped after each of three steps | gate rule 3 (`stopAfter`) | old-or-new | same, over the file | no |
| 10 | two overlapping observes | gate rule 12 | one login, one record | same | no |
| 11 | a store caught mid change | gate rule 7 | not captured | same | no |
| 12 | a locked keychain | gate rule 10 with a refusing runner | vault read fails → "never kept" this pass, nothing deleted | legacy read fails → miss → null, nothing deleted; the sealed file still answers once kept | no |
| 13 | the Phase 208 legacy item, unscoped spelling | gate rule 17 (`presentMoved`); `probe-p208-migrate.mts` on real `security` | moved to the scoped item | moved to the sealed file, read back, deleted | no |
| 14 | the legacy item, scoped spelling | gate rule 17 (a)–(e); `probe:p304` launches 1–4 | read in place | read through once, sealed, deleted; a kill at any step leaves a copy | no |
| 15 | **287**: a default lift over an over-cap default store, default session live | rule 21 (g′) control; p211 step 8 | **DESTROYS the sign in** ("work is signed in again.") | the sign in is KEPT and promoted into a row that can be chosen; the lift reaches the session | no |
| 16 | **287**: a switch whose own store grew past the vendor cap under the same account | p211 step 10 | refused for ever, row promises "Puts this account back." | in place, no promise, no refusal | no |
| 17 | **287**: the vendor's default item cannot take the chosen sign in (L5b) | rule 21 (g′); p287 test | `ok:false`, ordinary sentence, choice NOT recorded | `ok:true`, choice recorded, RUNNING toast + Restart now, default item untouched | no |
| 18 | **287**: the vendor's login item cannot take it (L5a) | rule 21 L5; p287 test | "Nothing could be written, so nothing changed.", nothing on the card | the SENTENCE, one error toast, `problem` set as for any refusal | no |
| 19 | **287**: the 31 readings of `probe:p211` steps 1–5 | p211 at both builds | 31/31 | 31/31 | no |
| 20 | **304**: a 4,193-byte codex store observed | `probe:p304` launch 4; p211 step 6 | refused, facts as never kept, 0 items | kept, `restores` after leaving, put back byte exact | no |
| 21 | **304**: 1 MB through the shipping `vaultPut`/`vaultGet` | rule 22; `probe:p304` drive | refused (`-i` cap) | round trips by sha256 | no |
| 22 | a harness launch without the mock keychain | `harnessSeal()` | plaintext 0600 file | keeps nothing, never reaches his Safe Storage key | named cost, §8 |

A row that regresses drops from the phase. NO TOKEN BYTE in any output; rule 9 now covers the sealed file's
bytes too. No photograph.

## §7 The refusals, in full

**From the 304 entry.** No change to how the VENDOR's item is written: `-i`, hex, `-U`, `-a` first, the
account from `claudeStoreAddress`, and the byte cap in front of it — `securityLineFits`,
`SECURITY_LINE_MAX_BYTES`, `tooLong` and `CredentialTooLarge` stay as Phase 287 left them. No change to what
the vendor reads, and no write of `~/.claude/.credentials.json`; 287's candidate (c) needs his ruling and is
queued, not built. Nothing about the `-w` escape (prompts twice, truncates at 128 bytes, a newline stores
zero — closed). NOT the argv, which is how orca does it (`src/main/claude-accounts/keychain.ts:212-221`,
`ARG_MAX`): an argv is readable by every process through `ps -ww`, and Tortie runs a fleet of agents under one
account, several with safeguards off; orca gives each codex account its own `CODEX_HOME` and never met this;
Claude Code itself switches to argv at 4,032 bytes, which is a reason not to feel bad about the vendor's
exposure and not a reason to add Tortie's own. NOT a backend chosen by SIZE: two backends forever, every read
asking both, a credential crossing the boundary mid-life; the cost of one backend is named — his four real
`Tortie-credentials-claude` items must move, which is why the migration never leaves zero copies. No new
closed alphabet, no change to `LOGIN_PROVIDERS` or `StoreWhere`, no new dependency or native code (refusal 6;
`safeStorage` is Electron's own). No change to the record file, the sweep, `swap.ts`'s three steps, the locks,
the watcher or the meter. No fix for the other default-lift loss: a capture refused for any reason OTHER than
size (now: the seal unavailable, a read-back that disagreed) still lets the default lift write over an unkept
sign in — stated, not fixed. No release.

**From the 287 entry and its spec §7.** No `security` call against any keychain but a scratch one, and no
`-w` or `-g` anywhere real (§5.7's attributes-only count is the one exception, the brief's own). No payload on
a command line. No change to how a credential UNDER the cap is written. No change to the meter's reader. Not
the same loss for other refusal reasons. No toast on the card for any other refusal. No fourth surface for
the sentence (no hover, tooltip or disclosure). No change to `sign-in-watch.ts`. No clearing of `problem` when
the Add login dialog opens (`AddLoginModal.tsx:60-66` resets `error` only; predates both phases). No change to
`SECURITY_TIMEOUT_MS`, the discard after a refused stage, or `isPlainKeychainPath`. No edit to `docs/BACKLOG.md`
by a builder.

**Added by this spec.** No plain or identity seal exported from any shipping module (the gate's ablation (i)
is exactly that). No log line in the credentials domain. No `has`/`put` on `LegacyVault`. The harness seams
wrap the two seams they are handed and put no hook inside `vault.ts`.

## §8 Where this spec departs from the entry, and every citation that drifted

1. **`firstWhy` and the `!wrote` arm SURVIVE** (entry §5 lists both as deleted). The entry's premise "every
   `tooLarge` fact originates in the VAULT write's refusal" is false for these two: `firstWhy` is set at
   `keep.ts:1191` from `lifted.why`, which is `done.why` from the VENDOR's default write, and the same entry
   keeps `ActivateResult.why` on the `ok: true` arm, `LOGIN_TOO_LARGE_RUNNING` and the renderer's `'chosen'`
   outcome ("L5 still refuses and still stands"), none of which has any other source. Deleting the arm would
   also return that click to the parent's `ok:false` with the choice unrecorded (§6.3 row 17 today) — not a
   regression against today, but strictly worse than 287's true sentence. Ablation 10 therefore stays.
2. **Rule 17's digest, empty-scope and cross-profile clauses are kept as read-side clauses**, not given way,
   because the read-through composes `vaultServiceFor(slot, root)` and must never reach another profile's item.
3. **`migrate.ts` gains ~10 lines** ("untouched or minimally"): without them the entry's "swept on a later
   launch" is false, because a `get` that hits never asks `legacy` again.
4. **`probe:p304` uses Chromium's mock keychain** (the entry: "the REAL `safeStorage`"): the real API and the
   real OSCrypt path, a mock KEY, for the reasons in §5.7; four launches one at a time, not one, because a
   kill is a launch. **`harnessSeal()` refuses without the mock switch**, a named cost: `probe-p202-logins.mjs`
   and `probe-p206-nits.mjs` (GMUX_PROBES launches that plant credentials without the switch) will keep
   nothing; neither is in this phase's run list and neither reads `kept` as far as this reader found —
   the verifier may run `probe:p206` once.
5. **The 1 MB app arm needs a harness seam** (`vault-drive.ts`), because `CREDENTIAL_MAX_BYTES` (256 KB,
   `payload.ts:63`) stops a 1 MB store at the observe; the entry's "through the shipping `vaultPut`" holds, the
   route to it does not go through a store.
6. **`VaultBackend.kind` is removed** (the entry is silent); its one reader was `index.ts:355`.
7. **The 287 CHANGELOG item is under 0.109.0**, not Unreleased; B moves it.

Drifted citations (entry → tree): `stores.ts:326`/`:365` (codex files) → `:334`/`:385`; `:335`/`:373`
(claude items) → `:345`/`:395`; `vault.ts:178` (`fileVault`) → `:185`; `vault.ts:156`/`:162` → `:163`/`:169`;
`keep.ts` numbers in 287's spec §2.4 (`:1319-1324`, `:1083`, `:1110-1112`, `:1124-1127`, `:1129-1138`,
`:1362-1363`) → `:1419-1439`, `:1142`, `:1189-1191`, `:1205-1225`, `:1227-1237`, `:1504-1510`;
`probe-p211-switch.mjs:253-266` (`inventory()`) → the function is gone since 287, the pins are at `:266-280`;
`build/assert-electron-teardown.mjs:243` → `:250`; `build/p287/SPEC.md §11`'s "28, 93, 127 and 93 bytes" is
wrong (28, 116, 135, 91 measured). Unchanged and confirmed: `vault.ts:24-27`, `:110`, `:133`; `index.ts:266`;
`migrate.ts:69`; `settings/store.ts:60`, `:753`, `:791-794`, `:806`, `:827`; `security.ts:245-250`;
`p281-vendor-address.test.ts:258`; `--mac` only is `package.json:242` (`electron-builder --mac`), not `electron-builder.yml` as the entry says.

## §As built (the integrator's round, 2026-09-21)

Written over `/private/tmp/wt-p304` after the three builders and the second copy of builder C had stopped
(the last tracked write was `build/conformance-credentials.mjs` at 04:48:57). Every difference from the
sections above is recorded here, with the entry winning wherever the two disagreed, and every number below
was measured in this tree rather than carried from a report.

### The two sentences are NOT §4.1's, and the entry is why

§4.1's drafts ("too large for the agent to hold in the keychain", 119 bytes / `c65502cbe5a4e90e`; RUNNING 141 /
`8a9eba68d7702559`) did not ship. Builder B read them against the tree and found "for the agent to hold" false on
L5b, where the agent's per-login entry HOLDS the sign in and the agent's own writer switches to argv above 4,032
bytes, so the ceiling is Tortie's `security -i` line and not the agent's; and "the sign in that is there" naming
nothing on the common L5a arm, a "Kept by Tortie" row whose own store is EMPTY. The entry demands a sentence about
the agent's copy that is true on every arm, so the entry wins:

| Constant | Exact bytes | Bytes | sha256, first 16 |
| --- | --- | --- | --- |
| `LOGIN_TOO_LARGE_SENTENCE` | `This sign in is too large for Tortie to write into the keychain entry the agent reads, so nothing was put back.` | 111 | `123ddf8f842d3fa7` |
| `LOGIN_TOO_LARGE_RUNNING` | `Switched for new sessions. This sign in is too large for Tortie to write into the keychain entry the running session reads, so that session keeps its current sign in.` | 166 | `fc94a671cccfc47f` |

Every pin agrees, re-derived with `node -e` over the file: `build/probe-p211-switch.mjs:298-299` (111, 166),
`src/renderer/state/__tests__/p287-too-large-say.test.ts:161-172` (bytes, `.length`, digests), `build/p287/SPEC.md`
§12.1 (appended, §2.3 left as written), and this section. Both gates read the sentence from `login-copy.ts` at
run time and never pin it. `probe:p211 --self-test` no longer throws: 60 of 60.

### The count the entry made, measured

Entry item 5 said "about 1,220 lines deleted against about 540 added, a net deletion on every count", and it is
not what this tree does. Measured with `git diff --numstat` (working tree against the index that holds 287) plus
`wc -l` over the untracked files:

| Where | 304 added | 304 deleted |
| --- | --- | --- |
| `src/` outside tests, tracked, CODE lines | 192 | 151 |
| `src/` outside tests, tracked, comment and blank lines | 432 | 354 |
| `src/main/harness/vault-drive.ts`, new | 214 | 0 |
| `src/` tests, tracked | 300 | 240 |
| `src/` tests, untracked: `p287-too-large-copy.test.ts` gone whole, `p287-too-large.test.ts` 649 → 469, `p287-too-large-say.test.ts` 261 → 314, `p304-sealed-vault.test.ts` 388 new, `test-seal.ts` 101 new | 1,272 | 1,109 |
| `build/` tracked (both gates, both probes, p204, p208, p211, verification-checks, the floor) | 1,683 | 923 |
| `build/probe-p304.mjs`, new | 838 | 0 |

The mechanism itself is roughly flat in code: `sealedVault` and its seams add 56 lines to `vault.ts` and 64 to
`index.ts` against 31 and 11 removed, `keep.ts` loses 59 code lines and gains 31, `migrate.ts` gains 30 for the
sweep. What grew is prose, tests and the gates, which is where the entry's own §5 said the softest figures were.
A later round must not read "a net deletion" out of this phase; the ruling it lands on is "one backend, not
overcomplicated", and the code count is consistent with that while the tree count is not a deletion.

### What survives that the entry listed as deleted

`firstWhy`, the `!wrote` arm of `activateLogin` and its `if (firstWhy === 'too-large')` (§8.1 above, still true:
the reason is the VENDOR write's). `vaultServiceFor`, `vaultScopeDigest` and `VAULT_SERVICE_PREFIX` (entry item 1
had them going "as write-side names"): they survive as the LEGACY name composers `legacyKeychainVault` reads and
deletes through, and `migrate.ts` still needs the prefix. Only `VAULT_ACCOUNT`, `keychainVault`, `fileVault` and
`VaultBackend.kind` are gone.

### The vault, as landed (§3)

- `vault.ts` is §3.1 and §3.3 exactly, with two details §3.3 did not say: `readSealed` treats an opened empty
  string as a miss, and the read-through's `put` is the direct staged write (`writeNoFollowSync` then
  `renameNoFollowSync`) rather than `safeSwap`'s three steps, so the migration composes no `.pending` name.
- `NO_SEAL` (§3.4) does not exist. `harnessSeal()` asks `app.commandLine.hasSwitch('use-mock-keychain')` on every
  call, so the answer is the switch as it stands. `harnessSeal` is EXPORTED, for the one caller
  `src/main/harness/vault-drive.ts`; the seal a person's own launch gets is `electronSeal()` and it is not exported.
- `readyKeepDeps` runs `migrateUnscopedVault` on every darwin launch now that `vault.kind` is gone; a harness
  launch on the file shape is refused as `harness` where it was refused as `not-keychain` before. Nothing under
  `build/` reads the reason by name.
- `migrate.ts` is +63/−4, not §3.6's "~10 lines". §3.6's sweep deleted the scoped item whenever a sealed file
  existed, which LOSES the recorded credential in the older-build shape (a pre-304 build running again in the
  same profile writes the ITEM and the record while the file goes stale). Builder A applied the file's own
  existing rule instead: when the record names the item's bytes and not the file's, the file is rewritten from the
  item through `vaultPut`, which reads back before it answers ok, and only then is the item deleted; a refused
  rewrite counts `kept` and leaves both. `p208-migrate.test.ts` and rule 17e drive both shapes.
- `p204-credentials.test.ts:44` and `p206-sweep-reach.test.ts:36` lost `kind: 'file',` — the one edit outside
  every §2 list, forced by the type.
- Two stale sentences fixed by the integrator, comments only: `kept.ts:11` said the store "on macOS is the
  keychain"; `keep.ts:300` said a staged leftover "on macOS is a second keychain item". `swap.ts` is byte for
  byte what 287 left (its "both backends" sentence still describes the vendor's keychain target and a file target).

### The gates and probes, as landed (§5)

- `conformance:credentials`: 75 of 75 ablations red, exit 0, 54 s. Rule 22 (`sealed`) round trips 4,193, 65,536
  and 1,048,576 bytes by sha256 with the file never the payload, 0600 in 0700, zero `security` argvs on a put or a
  hit, and a null seal answering "Nothing could be written, so nothing changed." with no file. Rule 17 drives
  `readThrough.{miss, refusedDelete, wrapNull, openWrong}` and `sweep.{duplicate, recordedTwin}` (recordedTwin:
  moved 1, deleted 1). Rule 21 keeps (a) to (f), L5 at 1,940 bytes with a 60-character account (vendor line over the 4,000 byte cap
  bytes, refused by bytes, zero lines, no item), and (g′) L5b running and idle. Ablations 6, 7, 8, 11 and 12 of
  Phase 287 are gone with the arms; 10 stays; two rule 22 ablations added.
- `conformance:logins`: 27 of 27 ablations red (§5.3 said 26: "a size put back on the row" was added beside the
  two removed), exit 0, 13 s.
- `probe:p304 --self-test` 38 of 38 (41 of 41 after the fix round); `probe:p211 --self-test` 60 of 60;
  `probe:p208 --self-test` 20 of 20 (25 of 25 after the fix round); `probe:p204 --self-test` 13 of 13.
- `build/probe-p304.mjs` is §5.5 with two departures. The entry's "zero `Tortie-credentials-*` items after launch
  4" is unreachable in a harness launch: the duplicate sweep lives in `migrateUnscopedVault`, which every harness
  profile is refused (`harness`), so the items of BOTH kills that fell after the rename stay beside their files
  and launch 4 grades exactly TWO items left, the before-readback slot's and the before-delete slot's, each still
  holding its planted bytes (the fix round's count; the build round's grader demanded ONE and was red at HEAD,
  see "§As built, the fix round" below); the sweep is proved under plain node (rule 17e) and over the real
  `security` by `probe-p208-migrate.mts`'s new arms. And the record file is
  `kept.json` (`kept.ts:7`), not `.kept.json`. The one `security` call aimed at his search list is the §5.7 guard,
  `find-generic-password -s "Tortie Safe Storage"` with no `-g` and no `-w`, exit code only.
- `HELPER_USER_FLOOR` is 146 (`build/assert-electron-teardown.mjs:258`), 146 files reach the helper. Phase 300 also
  sets 146 tonight; whichever lands second becomes 147, at the main session's commit.
- `docs/audits/contract-baseline.txt` regenerated for the one new name `GMUX_HARNESS_VAULT_DRIVE` (`[env.names]`
  113 → 114); `gate:contract` green.
- CLAUDE.md's two rows appended as §5.8; `build/verification-checks.mjs` gains `electron('probe:p304')`.

### Drifted citations found by the builders, beyond §8's list

`p220-activation-truth.test.ts`'s `fileVault` calls were at 69 and 134 in the carried tree, not 66 and 130.
`security.ts`'s "both callers" sentence was at `:436-437`, inside `keychainWrite`'s doc, not inside `:442-476`.
`vault.ts:185` was `fileVault`, as §8 says. §5.6 step 6's "no `Tortie-credentials-codex*` item (both)" is false at
the parent, where steps 2 to 5's small keeps land in the scratch keychain; the probe grades no BIG digest on both
builds and zero Tortie items at HEAD only.

### Control bytes

Every touched file was scanned. One 0x1f exists at `build/logins-conformance-probe.mts:814`; it is at HEAD too
(`:802`), it is outside every hunk of this phase, and it is the deliberate field separator the `/bin/sh` stand-ins
for `security` write their argv with. No file this phase wrote or edited holds one.

### What no builder drove, for the verifiers

Everything about the running app and the real `safeStorage`: `probe:p304` at HEAD and at
`P304_PARENT_CHECKOUT=/private/tmp/wt-p299`, `probe:p211` both builds, `probe:p208`, `probe:p204`, and
`probe:p206` once (§8.4's named cost). No builder started an Electron.

## §As built, the fix round (2026-09-21, after the judge's needs_work)

One fix round, three blocking problems, each at the place the judge named. No product code moves except the
four-line guard in problem 2. No Electron was launched and no timing taken; the reverifier drives the app runs.

### Problem 1 — the phase's own probe was red at HEAD, and the grader was wrong, not the product

`build/probe-p304.mjs` graded launch 4 against ONE duplicate item and read TWO. Both lenses' kills agree with
§3.5: a kill before the read-back fires AFTER `renameNoFollowSync`, so the sealed file is complete at its final
name, the next `get` HITS it and by design asks the keychain nothing (rule 22, no `security` argv on a hit), and a
harness profile is refused the sweep. So the before-readback slot AND the before-delete slot each leave a
duplicate; only the before-write slot, with no file, reads through on launch 4. The entry's item 4 sentence ("an
unreferenced sealed file the next `get` overwrites") describes a kill before the RENAME and is corrected by the
main session's docs commit.

- `gradeMoved`'s HEAD arm: `itemsLeft === 2`, `duplicatesAreTheTwoKilledAfterRename` (the set of items left
  equals `{scopedName(before-readback slot), scopedName(before-delete slot)}`) and `duplicatesHoldTheirBytes`
  (each read by `-w` against the SCRATCH keychain file only, through `readScratch`, equal to its plant). The
  parent arm is unchanged, 3 items in place and 0 files. `duplicateIsTheDeleteSlot` and `duplicateHoldsItsBytes`
  are gone.
- Self-test fixtures: "two duplicates, both after the rename" green; "one item left, which the build round graded
  as right", "three items left", "a duplicate that is not one of the two", "a duplicate whose bytes moved" and
  "zero items left" red. `probe:p304 --self-test` 41 of 41 (was 38).
- The header (reading 1) and "§As built, the gates and probes" above now say two duplicates, one from each kill
  after the rename, both swept only by the own-profile boot pass (rule 17e, `probe-p208-migrate.mts`).

### Problem 2 — the one arm that destroyed an unproven copy

`migrate.ts`'s Phase 304 sweep, the `if (twin !== null)` block, left `proved` true when the sealed file held A,
the scoped item held B and the record named NEITHER (kept.json absent, unparseable or its row dropped), and
deleted the item, so B existed nowhere afterwards. Against the entry's "nowhere" and "the safe direction is the
duplicate". Not a regression against today (the pair cannot exist at the parent) and unreachable by a click
(`factsFromSlot` refuses a slot with no record), but the charter is never zero copies.

- `src/main/credentials/migrate.ts`: the block now reads the record once and has a fourth arm, `else if (twin !==
  sealed && !recordNames(record, sealed)) { proved = false; }`, so the item is deleted only when the bytes are
  equal, the record names the file, or the file was just rewritten from the item and `vaultPut` answered ok;
  otherwise `kept += 1` and both copies stay. The block comment names all four shapes and the header's rule
  paragraph names the fourth. sha256 `e19eae30a2634595…`.
- `src/main/credentials/__tests__/p208-migrate.test.ts`, the Phase 304 describe, two arms: "a scoped item whose
  bytes differ from the file with no record naming either is left in place and counted kept" (kept 1, deleted 0,
  no delete argv, the item still B, the file still A) and its control "a scoped item whose bytes differ from the
  file the record NAMES is deleted, because the file is proved" (deleted 1). Broken by hand with the guard
  replaced by `else if (false)`: the first arm red and only it (1 failed, 27 passed); `migrate.ts` restored by
  sha256 equal.
- `build/credentials-conformance-probe.mts`: `sweep.unprovenTwin = sweep(claudeCredential('unproven', '7'),
  null)` beside `duplicate` and `recordedTwin`.
- `build/conformance-credentials.mjs`: rule 17e gains the clause `unprovenTwin` must read refused false, moved 0,
  deleted 0, kept 1, failed 0, itemGone false, fileHoldsSealed true, fileHoldsTwin false, lines 0; and one
  ablation, "the sweep deleting a scoped item the record does not name beside a file it does not name either",
  which replaces the guard's `else if` with `else if (false)`. Under `P204_ABLATION_DETAIL=1` it moves `scope`
  alone. The header's rule 17 sentence names the clause. **76 of 76 ablations red, exit 0** (was 75).

### Problem 3 — two probes read a credential file of his to hash it

`build/probe-p208-vault.mjs`'s `hashFile` (over `/usr/bin/shasum`) and `build/probe-p204-accounts.mjs`'s `hashOf`
(over `readFileSync`) opened `~/.codex/auth.json`, `~/.claude/.credentials.json` and `~/.claude.json` to grade
them. A digest is not a token byte and the shape pre-exists at the parent, but the rule every verifier ran under
is `stat` at most, and `probe-p304.mjs:430-441` already has the reading.

- `probe-p208-vault.mjs`: `statOf` by `lstat` ({size, mtimeMs, ino} or `'absent'`), `fileIdentities()` at both
  ends, a new grader `gradeFileIdentity(before, after)` under `--self-test` (five fixtures: unchanged, absent at
  both ends, rewritten in place, replaced by rename, appeared), and the two log lines print the triple. The
  `execFileSync` import is gone. Reading 6 is written into the header. `probe:p208 --self-test` 25 of 25 (was 20).
- `probe-p204-accounts.mjs`: `identityOf` by `lstat` for `codexAuthFile` and `claudeJsonInformational`; the
  compare of the three that must not move is already `JSON.stringify` over the object, and the informational
  compare of `~/.claude.json` is now `JSON.stringify` too, because two objects are never `===`. `lstatSync`
  imported. The keychain fingerprint stays, attributes only. `probe:p204 --self-test` 13 of 13.
- §5.4 above says so under "FIX ROUND".

### Commands, every one under 90 s, exit codes

`npm run -s typecheck` 0 · `npx vitest run --no-cache src/main/credentials src/main/logins
src/renderer/state/__tests__/p287-too-large-say.test.ts` 0, 17 files, 229 tests (was 227) ·
`node build/conformance-credentials.mjs` 0, 76 of 76 ablations red · `node build/conformance-logins.mjs` 0, 27 of
27 · `node build/probe-p211-switch.mjs --self-test` 0, 60 of 60 · `node build/probe-p304.mjs --self-test` 0, 41 of
41 · `node build/probe-p208-vault.mjs --self-test` 0, 25 of 25 · `node build/probe-p204-accounts.mjs --self-test`
0, 13 of 13 · `node build/assert-electron-teardown.mjs` 0, 146 of floor 146 (Phase 300 also sets 146; whichever
lands second becomes 147 at the main session's commit) · `node build/assert-background-teardown.mjs` 0, 19 of 19 ·
control bytes: `LC_ALL=C grep -cP "[\x00-\x08\x0b\x0c\x0e-\x1f]"` 0 over every file this round touched.

### What the fix round did NOT do

Nothing WORSE than today was found in the judge's table except the Safe Storage row, which the operator's own
ruling accepts and which is not repaired here; nothing was removed from the phase. The four non-blocking product
notes (`activateLogin`'s record-digest check, a throwing `seal.open` on the read-back, the partial arm's `says`,
the CHANGELOG clause) are left for the main session and a later round as the judge ruled. `probe-p208-migrate.mts`
gains no arm; its `duplicateSwept` plants EQUAL bytes and is untouched by the guard. CLAUDE.md's
`conformance:credentials` row still reads "the boot pass sweeping a duplicate", which stays true. No Electron.
