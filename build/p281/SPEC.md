# Phase 281 — the Claude meter reads the item Claude Code reads

**Subject.** `fix(credentials): address Claude's keychain item by service and account`
**First body line.** `Phase 281: the Claude meter reads the item Claude Code reads`
**Tier 3.** It reads and writes the person's credential store, he reported the symptom, and the change
decides whose numbers a login's card draws.
**Charter.** `docs/research/126-claude-usage-reliability.md` §5, §7 and §8 (landed `19a3007c`), and the
`## Phase 281` entry in `docs/BACKLOG.md`. The operator ran the attributes-only lookup with `-a` himself
before this spec was written: exit 0, and Claude Code's own item exists under his account and was written
that day, so research 126's cause is confirmed.

This file is the build contract for the two parallel builders (U, the usage domain, and C, the
credentials domain), the integrator and the gate author. It was written at `cc337e67` in
`/private/tmp/wt-p281`. Every line number below is from that tree. The one exception is
`src/main/usage/credentials.ts`, whose numbers are AFTER step 0 below landed.

---

## 0. What is already built (the spec author's step, done)

`src/main/usage/credentials.ts` now exports the shared vendor copies, and
`src/main/usage/__tests__/p281-vendor-address.test.ts` pins them (22 tests). `npm run typecheck` is green,
`conformance:credentials` (60 of 60 ablations) and `conformance:logins` are green, and the neighbouring
usage suites (`p181-credentials`, `p202-login-meter`, `p203-login-accounts`) pass unchanged.

The new test was ablated clause by clause over the shipping file before this spec was written. Every one
went red: the NFC step removed (3 red), `CLAUDE_SECURESTORAGE_CONFIG_DIR` asked for non-empty rather than
defined (2), a `USER` that fails the pattern falling through to the user name (2), the `.` staged form
dropped from the predicate (1), the plain name replaced (4), the login branch removed (3), the fallback
account changed (3), and the predicate made to answer true for everything (1).

### 0.1 The exports, exactly

```ts
/** unchanged */
export const CLAUDE_KEYCHAIN_SERVICE = 'Claude Code-credentials';

/** new: Cv's fallback */
export const CLAUDE_KEYCHAIN_FALLBACK_ACCOUNT = 'claude-code-user';

/** new: a copy of Cv. osUserName is userInfo().username, injected; absent means not known. */
export function claudeKeychainAccount(
  env: Readonly<Record<string, string | undefined>>,
  osUserName?: () => string
): string;

/** changed: hashes configDir.normalize('NFC'); otherwise the string as given */
export function claudeScopedService(configDir: string): string;

/** new: the ONE name. A login dir gives its scoped name; otherwise a copy of mI. */
export function claudeKeychainService(
  env: Readonly<Record<string, string | undefined>>,
  loginDir: string | null
): string;

/** new: plain name, or plain name + '-' …, or plain name + '.' … */
export function isClaudeVendorService(service: string): boolean;
```

`claudeKeychainAccount` reads `env['USER']` when it is defined and not empty and never asks `osUserName`
then (the vendor's `||` short circuit, so a `USER` that fails the pattern gives the fallback WITHOUT trying
the user name). Otherwise it calls `osUserName`; a throw, an absent function, an empty answer, a non-string
or a name failing `/^[a-zA-Z0-9._-]+$/` all give `claude-code-user`. It never reads `process.env`.

`claudeKeychainService(env, loginDir)`:

| Input | Answer |
| --- | --- |
| `loginDir` non-empty | `claudeScopedService(loginDir)`, whatever env holds |
| `CLAUDE_SECURESTORAGE_CONFIG_DIR` defined and `''` | plain name, even with `CLAUDE_CONFIG_DIR` set |
| `CLAUDE_SECURESTORAGE_CONFIG_DIR` defined and not empty | `claudeScopedService(that)` |
| otherwise `CLAUDE_CONFIG_DIR` non-empty | `claudeScopedService(that)` and nothing else |
| otherwise | plain name |

`loginDir === ''` is read as the default login. A key present with the value `undefined` is unset.

### 0.2 THE ONE CORRECTION TO D1, and why

D1 said the predicate is "the plain name, or any name beginning with the plain name plus `-`, which
includes Tortie's `.tortie-pending` staged names". That misses one staged name. `keychainTarget`
(`src/main/credentials/stores.ts:241`) stages at `${service}.tortie-pending`, and for the DEFAULT store
(`defaultStoreTarget`, `:311-326`) `service` is the plain name, so the staged item is
`Claude Code-credentials.tortie-pending`, which does not begin with `Claude Code-credentials-`. A predicate
without it would let `security.ts` pass a service-only read, delete or attribute call on that name. So
`isClaudeVendorService` also answers true for the plain name followed by `.`. `Claude Code-credentialsX`
is still false, as D1 requires, and so are `Claude Code` (the vendor's API key item) and
`Claude Code-doctor-probe`. This widens D1 to the set D1 itself described; it does not reopen it.

The bundle agreed with D1 in every other detail (§1).

---

## 1. The vendor rule, re-read from the installed bundle

Read only, fixed-string `grep -a -b -o -F` with a bound, then a `dd` window. No regex over the binary.

**Bundle.** `/Users/gdc/.local/share/claude/versions/2.1.274` (214,149,552 bytes). The same functions
were read in `2.1.273` under other minified names (`xP` for `mI`, `XE` for `Cv`, `RS` for `lb`, near
offset 169,844,797), with identical bodies.

**The chunk.** Near offset 170,928,000 a chunk imports `we` from `chunk-mphx27nj.js` and `createHash`,
`homedir`, `userInfo` and `join`, then defines, in order:

| Offset | Fixed string found | What it is |
| --- | --- | --- |
| 170,928,296 | `var Bee="-credentials"` | the credential suffix |
| 170,928,319 | `function lb(` | the plaintext file's storage dir (NOT used for the service name) |
| 170,928,454 | `function mI(` | the service name |
| 170,928,490 | `CLAUDE_SECURESTORAGE_CONFIG_DIR,t=` | inside `mI` |
| 170,928,749 | `function Cv(` | the account |
| 170,928,815 and 170,928,854 | `claude-code-user` | `Cv`'s two fallbacks |
| 169,220,656 | `var we=ds(` | the config dir `mI` hashes |
| 169,302,915 | `OAUTH_FILE_SUFFIX:""` | the production suffix, empty |
| 170,936,447 | `o===Q||o===ee` | the async read's exit handling, `Q=44`, `ee=36` |

The text, as read:

```
function mI(n=""){let e=process.env.CLAUDE_SECURESTORAGE_CONFIG_DIR,t=e!==void 0?!e:!process.env.CLAUDE_CONFIG_DIR,r=e!==void 0?e.normalize("NFC"):we(),c=t?"":`-${a("sha256").update(r).digest("hex").substring(0,8)}`;return`Claude Code${Xt().OAUTH_FILE_SUFFIX}${n}${c}`}
var s=/^[a-zA-Z0-9._-]+$/;function Cv(){let n;try{n=process.env.USER||u().username}catch{n="claude-code-user"}if(!s.test(n))return"claude-code-user";return n}
function s(){return process.env.CLAUDE_CONFIG_DIR}var we=ds(()=>(s()??a(R(),".claude")).normalize("NFC"),s);
```

**Every call that names the credential item passes `-a Cv()`** against `mI(Bee)`:

| Offset | Call |
| --- | --- |
| 170,934,256 | sync read: `security find-generic-password -a "${o}" -w -s "${a}"` |
| 170,935,494 | write over `-i`: `add-generic-password -U -a "${a}" -s "${n}" -X "${s}"` |
| 170,935,786 | write over argv when stdin is too long: `["add-generic-password","-U","-a",a,"-s",n,"-X",s]` |
| 170,936,143 | delete: `["delete-generic-password","-a",r,"-s",e]` |
| 170,936,315 | async read: `["find-generic-password","-a",n,"-w","-s",r]`; exit 0 with output → payload; exit 0 empty, 44, or 36 (unless strict) → null; anything else → failure |
| 170,949,443 | startup prefetch: `["find-generic-password","-a",Cv(),"-w","-s",e]` over `mI(Bee)` and `mI()` |
| 190,408,849 | SDK read: `["find-generic-password","-a",Cv(),"-w","-s",e]` over `mI(Bee)` |

The other `generic-password` strings name OTHER items, all with `-a Cv()`: the API key item `mI()` at
171,967,904, 172,012,301, 172,013,112 and 172,041,585; `Claude Code-doctor-probe` at 179,642,327; the
device key store at 187,587,684 and 187,588,245. The only service-only form, at 191,629,294, is help text:
`security find-generic-password -s anthropic-api -w`. Offsets below 80,000,000 are the bytecode copies.

**Where D1 matched exactly.** The account rule, the `CLAUDE_SECURESTORAGE_CONFIG_DIR` defined-versus-empty
test (`e!==void 0`), `CLAUDE_CONFIG_DIR` asked for truthiness, the NFC step on both variables, the
eight-character sha256 suffix, and no plain-name read when a config dir is set. **Where it did not:** only
the staged-name predicate in §0.2, which is Tortie's own name, not the vendor's.

**What the reading adds that D1 did not say.**

1. The vendor hashes the directory string AS GIVEN apart from NFC: no `resolve`, no trailing slash
   removed. So `claudeScopedService(dir)` must receive the exact string a session's `CLAUDE_CONFIG_DIR`
   carries, which is what `loginPaneEnv` sets today.
2. The vendor treats exit 36 as absent in its default read. D5 deliberately does not (§3.3).
3. `lb`, the plaintext file's directory, also follows `CLAUDE_SECURESTORAGE_CONFIG_DIR`. Tortie's file
   read does not. That is a stated limit of this phase (§8), not something to build.

---

## 2. The decisions, as they are to be built

- **D1.** Built (§0). Every other domain calls these functions and composes no service name or account of
  its own. `claudeServicesFor` goes (D3).
- **D2.** Every read, presence check, attribute read, write and delete of a name for which
  `isClaudeVendorService` answers true carries `-a claudeKeychainAccount(...)`. There is no service-only
  lookup of a vendor item anywhere in `src/`, and no fallback to one when the qualified lookup misses.
- **D3.** No list of services. Every reader, presence check, observe, fingerprint and write target asks
  the ONE name `claudeKeychainService(env, loginDir)` gives. No plain-name read after a scoped one.
- **D4.** Every `security.ts` function that names a service takes the account as an explicit parameter
  (`string | null`). A vendor service with a null, empty or refused account is REFUSED before the runner is
  called. Tortie's own vault names pass `null` and keep their argv byte for byte.
- **D5.** The usage keychain seam answers payload, null (exit 44 only), or throws (§3.3).
- **D6.** The credentials domain stops copying accounts (§4.2).
- **D7.** The comments that describe the old behaviour are rewritten (named per file below).
- **D8.** Out of scope (§9).
- **D9.** A test pinning old behaviour is rewritten, never deleted, and the builder's report names it
  with the old and new assertion. A refusal assertion is never weakened.

---

## 3. Builder U: the usage domain

### 3.1 Files U owns

- `src/main/usage/credentials.ts`, EXCEPT the five exports in §0.1, which U does not change.
- `src/main/usage/login-accounts.ts`
- `src/main/harness/usage-fixture.ts`
- `src/main/usage/__tests__/**` (the new `p281-vendor-address.test.ts` is the spec author's; U may add
  cases to it and may not weaken one)

`src/main/usage/ipc.ts` and `src/main/usage/service.ts` need NO change: the harness seam
`keychain: () => Promise<null>` (`ipc.ts:72-97`) stays assignable and means absent, and
`fetchProvider` (`service.ts:339-349`) already maps a thrown read to `unavailable`.

### 3.2 The seams, exactly

```ts
export interface CredentialDeps {
  /**
   * `security find-generic-password -a <account> -s <service> -w`.
   * Resolves the payload decoded through decodeKeychainPayload (possibly ''), resolves null ONLY when
   * the item does not exist (security exit 44), and THROWS when the item could not be read: any other
   * exit including 36, a signal, a spawn error, the deadline, a cancel, or a refused argument.
   */
  keychain(service: string, account: string): Promise<string | null>;
  readText(path: string): Promise<string | null>;
  env: Record<string, string | undefined>;
  home: string;
  /** userInfo().username, for claudeKeychainAccount. Optional: absent means not known. */
  osUserName?(): string;
  cancel?(): number;
}

export function keychainReader(bin?: string): {
  keychain(service: string, account: string): Promise<string | null>;
  cancel(): number;
};

export interface LoginAccountDeps {
  /** Does the item at (service, account) exist? ATTRIBUTES ONLY, never -w or -g. */
  keychainHas(service: string, account: string): Promise<boolean>;
  exists(path: string): Promise<boolean>;
  readText(path: string): Promise<string | null>;
  env: Record<string, string | undefined>;
  home: string;
  now(): number;
  /** userInfo().username, for claudeKeychainAccount. Optional: absent means not known. */
  osUserName?(): string;
}
```

`osUserName` is OPTIONAL on purpose, so no existing literal in either domain's tests or in a build probe
breaks, and a seam that leaves it out gets the vendor's own fallback rather than the machine's user name.
`defaultCredentialDeps` and `defaultLoginAccountDeps` MUST pass `osUserName: () => userInfo().username`
(from `node:os`), and the gate pins both.

### 3.3 `keychainReader` (`credentials.ts:258-293`)

- argv `['find-generic-password', '-a', account, '-s', service, '-w']`, the same deadline and cap.
- An empty `account` throws before spawning. Nothing is logged.
- `run.code === 0`: return `decodeKeychainPayload(run.stdout)`, imported from `../credentials/security`.
  That helper exists and is not rewritten. Decoding is also what the vendor's hex printing needs (research
  126 §2.7: a payload holding a newline prints as hex and read `missing` in the meter).
- `run.code === 44`: return null.
- Anything else, being a spawn error, `timedOut`, `cancelled`, a null code or any other exit including
  36: throw an `Error` with a fixed sentence naming no service, account or output.
- A COMMENT SAYS WHY 36 IS NOT ABSENT: Claude Code's own read treats 36 as absent (bundle offset
  170,936,447), and Tortie deliberately does not, because a locked keychain is not a sign-out and the
  sign-in sentence would send the person to the wrong remedy (research 126 §7.2 proof step 4).
- Rewrite the comments at `:249-251` and `:277-278`, which say a miss and a failure are the same answer.

Importing `../credentials/security` from the usage domain is allowed: no facade rule covers
`src/main/credentials/` and it makes no cycle (`security.ts` imports only `./lifecycle` and
`../proc/guarded`). Re-run `npm run typecheck`, which runs `assert-import-boundaries` and
`assert-no-runtime-cycles`.

### 3.4 `readClaudeCredential` (`credentials.ts:379-412`)

```
service = claudeKeychainService(deps.env, loginDir)
account = claudeKeychainAccount(deps.env, deps.osUserName)
unreadable = false
try  payload = await deps.keychain(service, account)
catch  unreadable = true, payload = null
if payload !== null and claudeLoginFrom(payload) !== null  → ok
file = the same directory rule as today (loginDir, else non-empty CLAUDE_CONFIG_DIR, else ~/.claude)
if file text gives claudeLoginFrom !== null  → ok
if unreadable → throw (a fixed sentence)
→ missing
```

`missing` only when every store tried was absent or held no usable credential. An unusable payload
(not JSON, no `claudeAiOauth.accessToken`) is "no usable credential", not unreadable. A chosen login still
never reads the plain item (the removal at `:357-378` stays). Rewrite the branch description at `:361-363`.

### 3.5 `login-accounts.ts`

- `claudeServicesFor` (`:127-144`) goes. U removes it LAST, and only once
  `grep -rn claudeServicesFor src build` shows no importer outside U's files; if C's `stores.ts` or
  `watch.ts` still import it, U leaves it and says so, and the integrator removes it.
- `readLoginPresence` (`:378-390`), claude branch, written so a gate can anchor on it:

  ```ts
  if (provider === 'claude') {
    const service = claudeKeychainService(d.env, loginDir);
    const account = claudeKeychainAccount(d.env, d.osUserName);
    if (await d.keychainHas(service, account)) return true;
    return d.exists(claudeCredentialFileFor(d, loginDir));
  }
  ```

- `defaultLoginAccountDeps` (`:413-427`): argv `['find-generic-password', '-a', account, '-s', service]`,
  still no `-w`, still `err === null`. It is NOT moved to the D5 split (§9). Add `osUserName`.
- Rewrite the header paragraph at `:28-33` (it quotes the service-only form) and the import at `:68`.

### 3.6 `src/main/harness/usage-fixture.ts`

`:106` `keychainHas: async () => false` and `:126` `keychain: async () => null` stay assignable and keep
meaning "no keychain at all". Only the comments change if they name the old argv.

---

## 4. Builder C: the credentials domain

### 4.1 Files C owns

- `src/main/credentials/security.ts`, `stores.ts`, `watch.ts`, `index.ts`, `kept.ts` (comment only), and
  the call sites in `vault.ts` and `migrate.ts`
- `src/main/harness/keychain-harness.ts`
- `src/main/logins/**` comments and call sites (today only the comment at `logins/ipc.ts:35-37`)
- `src/main/credentials/__tests__/**`, `src/main/logins/__tests__/**`

### 4.2 `security.ts`, exactly

```ts
export async function keychainRead(runner: SecurityRunner, service: string, account: string | null): Promise<string | null>;
export async function keychainAccount(runner: SecurityRunner, service: string, account: string | null): Promise<string | null>;
export async function keychainModified(runner: SecurityRunner, service: string, account: string | null): Promise<string | null>;
export async function keychainHasItem(runner: SecurityRunner, service: string, account: string | null): Promise<boolean>;
export async function keychainDelete(runner: SecurityRunner, service: string, account: string | null): Promise<boolean>;
export async function keychainWrite(runner: SecurityRunner, service: string, account: string, payload: string): Promise<boolean>; // unchanged
```

- The account is a REQUIRED parameter whose type admits `null`, so every call site states it.
- **The refusal, before `runner.run`:** `isClaudeVendorService(service)` and the account is null,
  undefined, `''` or fails `isPlainSecurityName` → answer the function's existing refusal value (`null`,
  `false`) without calling the runner. `undefined` is treated as null at run time, because the untyped
  build probes (`build/probe-p208-migrate.mts`) still call with two arguments.
- A non-vendor name with a null account keeps TODAY'S argv byte for byte, so the vault, the migration,
  their tests and `probe-p208-migrate.mts` see no change.
- With an account the argv puts `-a <account>` before `-s`, matching the write:
  `['find-generic-password', '-a', account, '-s', service, '-w']`,
  `['find-generic-password', '-a', account, '-s', service]` (account, modified, has),
  `['delete-generic-password', '-a', account, '-s', service]`.
- `keychainWrite`'s two lines `const command = …` and `const { code } = await runner.run(['-i'], command);`
  do NOT move by one byte: the gate's orca ablation anchors on them.
- `security.ts` imports `isClaudeVendorService` from `../usage/credentials` (the domain already imports
  that module from `stores.ts`).
- Rewrite the header at `:22-31`: it says the vendor reaches its item "through the same program", and
  should now also say how the vendor ADDRESSES it (service and account, research 126 §2.4 and §5).
- Rewrite `keychainModified`'s note at `:260-265` if it keeps the `Hv` offset from an older bundle; the
  account function is `Cv` at 170,928,749 in 2.1.274.

### 4.3 `stores.ts`

One private helper, for example `vendorAddress(d, dir): { service: string; account: string }`, being
`claudeKeychainService(d.env, dir)` and `claudeKeychainAccount(d.env, () => d.userName)`.
`StoreDeps.userName` stays a `string`; its doc comment (`:77`) becomes "the OS user name the vendor's
account rule uses when `USER` is unset".

- `safeKeychain` (`:142-151`) takes and passes the account.
- `readStore` (`:171-193`): ONE service, no loop; `account` in the reading is the vendor account it asked
  with, set only when the item was found. No `keychainAccount` call remains.
- `claudeWriteService` (`:121-123`) stays (the gate probe calls it).
- `keychainTarget` (`:236-257`): `read`, `readStaged`, `commit`, `stage` and `discard` all carry the one
  account passed in.
- `storeTarget` (`:269-288`): `keychainTarget(d, claudeWriteService(dir), vendorAccount)`. Its first line
  `  if (dir === null || dir === '') return null;` does not move (a gate anchor). Rewrite the comment at
  `:280-284`.
- `defaultStoreTarget` (`:311-326`): `claudeKeychainService(d.env, null)` and the vendor account. Rewrite
  the comment at `:317-321` ("most specific first").
- `ownAccountName` (`:328-335`) goes.
- `forgetStore` (`:361-372`): both deletes carry the vendor account.
- The settle lines `:211-212` and `safeText`'s body `:135-139` do not move (gate anchors).

### 4.4 `watch.ts`, `index.ts`, `kept.ts`, `vault.ts`, `migrate.ts`, the harness

- `watch.ts:351-363` `defaultKeychainFingerprint`: one service, the vendor account passed to
  `keychainAccount` and `keychainModified`. Replace the `claudeServicesFor` import (`:52-56`). The
  fingerprint may keep its `service=account@modified` shape; the gate's ablation anchor on it will be
  updated by the gate author (§6.1).
- `index.ts`: `:81` re-exports `keychainHasItem`, unchanged in name. `:148` `userName: userInfo().username`
  stays. The harness shapes at `:188` and `:228` keep `userName: 'harness'`; note that with `USER` set the
  vendor account is `USER`, so a harness keychain now writes under that name in the SCRATCH keychain.
- `kept.ts:9` and `:48` say the record's account exists "so a write back preserves it". Rewrite: the
  field records the account the item was found under, and writes use the vendor rule.
- `vault.ts:160`, `:169`, and `migrate.ts:224`, `:260`, `:268`: pass `null`. Nothing else changes.
- `keychain-harness.ts:70`: `keychainHas: (service, account) => keychainHasItem(runner, service, account)`.
- `logins/ipc.ts:35-37`: the comment names `-a`.

---

## 5. Every call site, and who owns it

Found with `grep -rn -E "keychainRead|keychainAccount|keychainModified|keychainHasItem|keychainDelete|keychainWrite|claudeServicesFor|CLAUDE_KEYCHAIN_SERVICE|claudeScopedService|find-generic-password|delete-generic-password|add-generic-password|deps\.keychain|keychainHas|ownAccountName" src build`.

| Site | What | Owner |
| --- | --- | --- |
| `usage/credentials.ts:50` | `CredentialDeps.keychain` | U |
| `usage/credentials.ts:258-293` (`:270` argv) | `keychainReader` | U |
| `usage/credentials.ts:295-310` | `defaultCredentialDeps` | U |
| `usage/credentials.ts:379-412` (`:383-391`) | the service list, `deps.keychain(service)` | U |
| `usage/login-accounts.ts:30`, `:68`, `:96`, `:135-143`, `:384-385`, `:415-423` | comment, import, seam, `claudeServicesFor`, presence, default argv | U |
| `harness/usage-fixture.ts:106`, `:126` | harness seams (assignable) | U |
| `usage/ipc.ts:72-97` | harness keychain type (assignable, no change) | none |
| `credentials/security.ts:222-236`, `:239-254`, `:267-282`, `:285-292`, `:328-335` | the five readers and the delete | C |
| `credentials/security.ts:300-313` | `keychainWrite` (unchanged) | C |
| `credentials/stores.ts:41`, `:48`, `:122`, `:147`, `:175`, `:184`, `:243`, `:247`, `:249`, `:254`, `:285-286`, `:321-324`, `:329-335`, `:369`, `:371` | every store call | C |
| `credentials/watch.ts:54`, `:57`, `:355-357` | the backstop | C |
| `credentials/vault.ts:63-65`, `:160`, `:162`, `:169` | vault (pass `null`; write unchanged) | C |
| `credentials/migrate.ts:55`, `:224`, `:260`, `:268` | migration (pass `null`) | C |
| `credentials/index.ts:81` | re-export | C |
| `harness/keychain-harness.ts:37`, `:70` | harness presence | C |
| `logins/ipc.ts:36` | comment | C |
| `credentials/lifecycle.ts:39`, `credentials/swap.ts:32` | prose naming the verbs, still true | none |
| `build/credentials-conformance-probe.mts`, `build/conformance-credentials.mjs` | gate | gate author |
| `build/logins-conformance-probe.mts`, `build/conformance-logins.mjs` | gate | gate author |
| `build/probe-p202-logins.mjs:283`, `probe-p203-account.mjs:198`, `probe-p204-accounts.mjs:182`, `probe-p206-nits.mjs:291` | service-only lookups of HIS item in historical app probes | integrator (§7) |
| `build/probe-p208-migrate.mts:31-34`, `:61-189` | vault names, two-argument calls | none (§4.2 keeps them working) |
| `build/probe-p208-vault.mjs:335-343` | vault names on a scratch keychain | none |
| `build/p276/SPEC.md:519` | prose | none |

---

## 6. Tests and gate anchors that pin the old behaviour

### 6.1 Unit tests

| Test | Old assertion | New assertion | Owner |
| --- | --- | --- | --- |
| `usage/__tests__/p181-credentials.test.ts:72-78` "tries the scoped name FIRST and the plain one anyway when a config dir is set" | `asked` equals `[claudeScopedService('/tmp/cfg'), CLAUDE_KEYCHAIN_SERVICE]` | `asked` equals `[claudeScopedService('/tmp/cfg')]`; a keychain holding a credential ONLY under the plain name answers `missing` (the branch B row) | U |
| `usage/__tests__/p203-login-accounts.test.ts:215-224` "gives a login the scoped service and nothing else" | `claudeServicesFor(… CLAUDE_CONFIG_DIR '/c')` equals `[scoped('/c'), 'Claude Code-credentials']` | presence under `CLAUDE_CONFIG_DIR: '/c'` asks exactly `[scoped('/c')]`, with the account; login and default rows kept | U |
| `usage/__tests__/p181-credentials.test.ts:56-70`, `p202-login-meter.test.ts:76-126` | the service asked | unchanged, and extended to record the account | U |
| `usage/__tests__/p200-shutdown.test.ts:236-275` | a cancelled reader resolves null | the cancelled reader THROWS and the read still settles; the child-kill assertions stay | U |

No unit test in `src/main/credentials/__tests__` or `src/main/logins/__tests__` drives the keychain branch
of `stores.ts` (every `StoreDeps` literal there has `keychainForClaude: false`), so none pins the old
account copying. C adds the unit coverage: every vendor argv carries `-a`, a vendor call with a null
account never reaches the runner, `readStore` over two same-named items reads the vendor-account one,
`storeTarget` and `defaultStoreTarget` write under the vendor account with a stray `unknown` item
present, `forgetStore` deletes under the vendor account and leaves the stray, and the vault argv is
byte-identical to today.

### 6.2 `build/conformance-credentials.mjs` and its probe (gate author)

- **Ablation** `:2069-2078` "the item account attribute no longer preserved on a write back" anchors
  `const existing = await keychainAccount(d.runner, service);\n  const own = existing ?? (await ownAccountName(d));`
  in `stores.ts`. D6 removes those lines. Rewrite as the mistake a later round would make: the account
  copied from `keychainAccount` of the matched item again.
- **Ablation** `:2143-2152` "a delete counted whether or not security did it" anchors
  `const { code } = await runner.run(['delete-generic-password', '-s', service]);\n  return code === 0;`
  in `security.ts`. The argv changes, so the anchor moves.
- **Ablation** `:1924-1932` anchors `    parts.push(\`${service}=${account ?? ''}@${modified ?? ''}\`);` in
  `watch.ts`. It moves if the loop goes (indentation).
- **Anchors that must NOT move:** `stores.ts` `  if (dir === null || dir === '') return null;` (`:1537`),
  the two settle lines (`:1750`, `:1755`), `safeText`'s body (`:2273`), and `keychainWrite`'s two lines
  (`:1765-1767`).
- **Check** `:1234` `live.keychain.accountPreserved` and probe `:2183` `wrote?.account === 'p281-literal'` pin the
  old copying. Rewrite: the write's account equals `claudeKeychainAccount` of the arm's env and user name.
- **The fake `security`** (probe `:176-232`) keys items by service alone, ignores `-a`, and answers exit 1
  for a miss. It must key by (service, account), honour `-a` on find and delete, answer 44 for a miss,
  and every arm that seeds `account: 'p281-literal'` (probe `:1069-2251`, 23 sites) must seed under the vendor
  account the arm's `StoreDeps` produce (`env: {}` and `userName: 'gate'` give `gate`). Add a stray under
  `unknown` beside the vendor item in the keychain arm; `itemsNamed.length === 2` (`:1237`) then moves.
- **New rules**: every `find-`, `add-` and `delete-generic-password` argv aimed at a vendor service carries
  `-a`, read from source over every call site with the count pinned; a vendor call with no account never
  reaches the runner; no service list names the plain name after a scoped one.

### 6.3 `build/conformance-logins.mjs` and its probe (gate author)

- **A PRE-EXISTING DEFECT, found while writing this spec, that makes every logins ablation vacuous.** The
  ablation loop (`:980-1000`) copies `login-accounts.ts` and `credentials.ts` into `os.tmpdir()` and runs
  the probe with `runProbe(loginsDir, usageDir)` for ALL 16 ablations. Since Phase 200 (`8ea72480`)
  `usage/credentials.ts` imports `../proc/guarded`, which does not resolve from a temporary directory.
  Measured here: the probe over PRISTINE, unablated copies of both directories exits non-zero with
  `Cannot find module '../proc/guarded'`, and the gate's `verdict` turns that into `['error']`, which
  differs from the live verdict. So "16 of 16 ablations went red" has been red for the wrong reason, for
  every ablation, since that commit. A `-a` ablation added on top would prove nothing. The gate author
  fixes the harness FIRST, the way `conformance-credentials.mjs` already did for its own copies (siblings
  under `src/main/` named with a leading dot, removed in a `finally`), and makes an ablated probe that
  errors a failure rather than a red. Once it is honest, re-count which of the 16 still go red, and name
  any that do not in the phase report. §3.3's `decodeKeychainPayload` import adds
  `../credentials/security` to the same problem.
- **Ablation** `:741-751` "the keychain half taken out of presence" anchors the `claudeServicesFor` loop
  in `readLoginPresence`, which D3 removes. Re-anchor on the §3.5 lines.
- **Ablation** `:753-764` "a second login allowed to fall through to the plain keychain item" anchors
  `claudeServicesFor`'s login branch, which D3 removes. Re-express as a second `keychainHas` of the plain
  name in `readLoginPresence`.
- **Check** `:627` `askedForDefault.includes('Claude Code-credentials')` stays true with `env: {}`.
- **The probe's seams** (`logins-conformance-probe.mts:480-520`) key the keychain by service alone and
  record the service alone. Key by (service, account) and record both, so a presence check without `-a`
  is visible. Add the `-a` rule for `defaultLoginAccountDeps`'s argv beside rule 10's `-w` scan (`:275-282`).
- Rule 10's `asksForAPayload` (`:222-225`) must still find no `-w` in `login-accounts.ts`.

---

## 7. For the integrator

1. **Typecheck is expected red between the two builds.** U changes `LoginAccountDeps.keychainHas`; C's
   `keychain-harness.ts` passes a two-argument function to it. C changes `keychainHasItem`; only C calls
   it. Each builder runs vitest over its own directories and `npm run typecheck` at the end, and reports
   an error that names the OTHER builder's file rather than editing it.
2. Remove `claudeServicesFor` if U could not (§3.5).
3. **The historical probes** name his item by service alone (`probe-p203-account.mjs:198` and
   `probe-p204-accounts.mjs:182` fingerprint its attributes; `probe-p206-nits.mjs:291` hashes its
   attributes; `probe-p202-logins.mjs:283` hashes its `-w` output). With two same-named items those
   "untouched" fingerprints measure the stray, so they prove nothing about the item Claude Code reads.
   None is in a battery. Either add `-a` with a probe-local copy of the account rule that cites
   `claudeKeychainAccount`, or leave them and say in the commit body that D2's "anywhere" means `src/`.
   Do not run any of them: they read his real keychain.
4. The gates for this phase: typecheck, build, test, smoke:t1, `conformance:credentials`,
   `conformance:logins`, and `gate:checks` (a new `*.test.ts` was added under `src/`).

---

## 8. Risks and stated limits

- **The logins gate's ablations are vacuous today** (§6.3). Until fixed, nothing that gate says about an
  ablation is evidence.
- **A later Claude Code may change `Cv` or `mI`.** Read in 2.1.273 and 2.1.274 only. The account rule's
  `-a` addressing was read in 2.1.263 to 2.1.274 by research 126 §8.12.
- **`USER` that begins with `-`**, for example `-w`, passes the vendor's pattern. In the argv form it is the
  VALUE of `-a` (getopt takes the next element as the option's argument), and in the `-i` form it is
  quoted, which is what the vendor does too. The attack verifier should drive it over the scratch
  keychain and confirm no payload is printed by a presence call.
- **A string that is not the pane's `CLAUDE_CONFIG_DIR` byte for byte** names another item. The login
  directory is hashed as given apart from NFC. `loginPaneEnv` and `claudeKeychainService` must keep using
  the same string.
- **The first observe after the fix** reads an item whose bytes are days newer than the vault copy. It
  keeps a copy and mints no promotion ONLY because `sameAccountProven` (`keep.ts:622-633`) compares the
  subject and email from `.claude.json`, which never involve the keychain account. A store whose account
  file names neither promotes on every change (the residue `keep.ts:641-662` states).
- **The plaintext file path** does not follow `CLAUDE_SECURESTORAGE_CONFIG_DIR` (the vendor's `lb`). Not
  built.
- **Presence keeps collapsing failure into absent** (`login-accounts.ts:425`). D5 is the usage seam only.
  A LOCKED keychain is not that failure (corrected in Phase 281.1, measured): its attributes still read,
  exit 0 with the `acct` line, so presence answers present for it; only a `security` that fails outright
  collapses to absent here.
- **`defaultStoreDeps` calls `userInfo()` eagerly** (`index.ts:148`). A machine with no passwd entry throws
  there, where the vendor falls back to `claude-code-user`. Pre-existing and not changed.
- **A chosen login under `CLAUDE_SECURESTORAGE_CONFIG_DIR`** gets its own scoped name here while Claude
  Code, for every login, reads the plain item when the variable is empty and the variable's own scoped
  item when it is set (corrected in Phase 281.1; the earlier wording, "the one name that variable
  names", was wrong for the empty case). Stated in `claudeKeychainService`'s comment and PINNED since
  Phase 281.1 (§8.2, first bullet). The attack verifier drove every layout and this class was the only one
  that differed from the vendor rule; the parent differs the same way. The smallest follow-up it named is
  for `loginPaneEnv` to set `CLAUDE_SECURESTORAGE_CONFIG_DIR=<dir>` beside `CLAUDE_CONFIG_DIR=<dir>` on a
  chosen claude login's pane, which also moves the storage lock (`locks.ts:59-62`). Not built here.

### 8.1 Limits added after verification

- **`add-generic-password -U` moves the item it updates.** Measured by the keychain verifier on a scratch
  keychain: one item before and after, but behind every other item of the same service name, in the order
  a lookup by service alone uses. Both fake `security` programs updated in place and now move the row to
  the back, and both pin it (`p281-stores-address.test.ts`, the probe's `keychain.updateMovesBehind`).
  No HEAD verdict moved, because every HEAD call names the account. It explains the operator's machine:
  every Claude Code refresh is an `add -U`, which put its item back behind the stray each time.
- **A locked keychain has answered three ways on this machine, and every one but 44 throws** (rewritten in
  Phase 281.1). 36, per the vendor's own lock test. A hold with nothing printed until the child was
  killed, measured by the Phase 281 keychain verifier on a locked scratch keychain in an Aqua session,
  which the reader's five second deadline ends. And 152, errAuthorizationInternal ("Unable to obtain
  authorization for this operation"), at once and with no prompt, in 22 to 145 ms, measured twice in
  Phase 281.1 on a locked scratch keychain in an Aqua session, sandboxed and unsandboxed, with
  `show-keychain-info` on it answering 152 rather than the 36 the vendor's lock test expects. The login
  keychain in the search list was not measured locked. So the deadline is ONE route a locked keychain
  takes and not the route; the outcome the fix round claimed holds on every route (the reader threw, the
  meter kept 12 percent under `stale` and recovered to `ok` after the unlock). The `hang` and the `152`
  rows are both in `p281-usage-read.test.ts` part (c). The parent sent the same `-w` read, so none of this
  is new.
- **`security` prints a payload as hex when any BYTE is outside 0x20–0x7E** (measured in Phase 281.1, twice,
  on a scratch keychain), which is `isprint` in the C locale: a tab, DEL, a control character, and EVERY
  non-ASCII character (an accented letter, an emoji) print as lowercase hex; a trailing space and a tilde
  print raw. The Phase 281 decoder took the decoding only for a control character or DEL, so a credential
  JSON holding a tab (tab indentation) or any non-ASCII character (an MCP server name, which
  `JSON.stringify` keeps raw) came back from `keychainRead` and `keychainReader` as the hex string: the
  meter read `missing` and `readStore` captured nothing, and both fake `security` programs printed by
  the same wrong table so no test could see it. `securityPrintsRaw` in `security-print.ts` is now the one
  predicate, both fakes print by it, and the measured table is pinned as literal rows in
  `p281-stores-address.test.ts` and driven through the shipping reader in `p281-usage-read.test.ts` (d).
- **Keychain items the PARENT wrote under a copied account are unreachable now.** At the parent,
  `storeTarget` wrote a login's scoped item under whatever account a service-only lookup matched first,
  and `defaultStoreTarget` updated the stray itself with the chosen account's credential. HEAD addresses
  only the vendor account, so its `forgetStore` and staged sweep never delete such a copy. Nothing reads
  it, so it draws no wrong numbers, but removing that login leaves a credential in the keychain that
  Tortie will not delete. Whether any exists on the operator's machine is unknown. Deleting one needs his
  approval, for the same reason the stray is left alone.
- **A `USER` longer than 200 characters that passes the vendor's pattern splits the two domains.** The
  meter and presence read the vendor item, while `security.ts` refuses the account (`isPlainSecurityName`),
  so `readStore` reads nothing, a switch is refused and the fingerprint is empty. No stray is read and no
  wrong account is drawn.
- **An EMPTY `CLAUDE_CONFIG_DIR` names a different plaintext file for the vendor.** Re-read from 2.1.274 in
  the fix round: `we` is `(CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude")).normalize("NFC")` and the
  plaintext store is `join(lb(), ".credentials.json")`, so an empty value gives a path relative to the
  session's working directory, while `claudeCredentialFileFor` and `readClaudeCredential` read
  `~/.claude/.credentials.json`. The keychain name agrees (an empty value is the plain name on both sides).
  Pre-existing, and Tortie has no working directory of the session's to copy. Not built.
- **The backstop fingerprint ends with the characters `\000`**, the null escape `security` prints after
  the modification date. It is only compared for change, so it is harmless.

---

### 8.2 Limits the vendor re-derive verifier named, recorded by the landing session

The vendor re-derive verifier's findings did not reach the fix round, because the fix round's brief cut
the verdicts at 30,000 characters inside that verifier's report. They are recorded here instead. None
changes a reading on the operator's machine, where no `CLAUDE_*` variable is set.

- **`CLAUDE_SECURESTORAGE_CONFIG_DIR` with a chosen login** (630 of its 1,680 rows; 98 of 98 in the
  Phase 281.1 re-derive's own matrix): the vendor's `mI` names `scoped(SECURESTORAGE)`, or the plain name
  when it is empty, for every login, while Tortie names `scoped(loginDir)`. The verifier graded it major
  for two reasons, and the first version of this bullet carried only one. First, its brief counted every
  disagreeing row. Second, and substantive: the spec understated the consequence. With the variable
  defined and EMPTY, a chosen-login Claude Code session reads and writes the PLAIN item, the default
  account's credential, so the "second login" session runs on the default account while Tortie's meter,
  presence and switch target `scoped(loginDir)`, a name no session reads — the one-account's-numbers-
  under-another's-name shape Phase 281 was written to end. Its minimum ask was to pin the class as a
  NAMED exception in `p281-vendor-address.test.ts` and the gates, so the disagreement is executable and
  cannot widen silently. **Decision (Phase 281.1): pinned.** `p281-vendor-address.test.ts` holds the
  exception as one test (empty and set disagree, equal-to-the-login-directory and unset agree), and
  `conformance:logins` rule 18 drives the same four rows through the shipping `claudeKeychainService`
  with the vendor's answers derived by the gate, with an ablation that makes a chosen login follow the
  variable and turns rule 18 red. The fix stays the follow-up section 8 records (`loginPaneEnv` setting
  the variable beside `CLAUDE_CONFIG_DIR`), not built here.
- **`CLAUDE_CODE_CUSTOM_OAUTH_URL`**: the vendor's `Xt().OAUTH_FILE_SUFFIX` is `-custom-oauth` when that
  variable names one of three approved endpoints, and `mI` throws for any other value, so Claude Code's
  item becomes `Claude Code-custom-oauth-credentials[-hash]`. Tortie ignores the variable, asks the
  production name, and `isClaudeVendorService` does not recognise the custom name. A person on a custom
  OAuth endpoint reads as signed out, or reads a production item of theirs if one also exists.
- **The plaintext file directory** follows `CLAUDE_SECURESTORAGE_CONFIG_DIR` and NFC in the vendor (`lb`,
  `we`) and not in Tortie; APFS opens both NFC spellings as one file, so the variable matters, and so does
  the empty `CLAUDE_CONFIG_DIR` case in §8.1, which sends the vendor's plaintext file to a cwd-relative
  `.credentials.json` (found by the fix round, recorded there and not here).
- **The vendor is more lenient on a failed read than Tortie, on purpose.** Its async read answers absent on
  44, on 36 when `inaccessibleAs` is not `"failure"` (§1's table has both), on a runner that throws, and
  on exit 0 with empty output; its synchronous read, on any non-zero exit, the 2 s timeout, or an empty
  answer, serves its stale cache when it has one and answers absent otherwise. Tortie answers absent on
  44 alone (decision D5).
- **`add-generic-password` over `-i` above 4,032 characters**: the vendor switches to argv there and logs
  that the line exceeds the stdin limit. Tortie's `keychainWrite` always uses `-i`. MEASURED in Phase
  281.1, twice, under a scratch `HOME` where no default keychain resolves: a line of 3,923 and of 3,995
  characters (the keychain suffix included) writes and reads back exactly; a line of 4,123 and of 4,195
  characters writes NOTHING to the named keychain and `security -i` hangs with stdin closed until killed
  (65 s, 10 s). So past about 4,096 characters the trailing keychain path is lost, and for
  `defaultSecurityRunner(keychainFile)` a payload of about 1,985 bytes or more would have lost its
  scratch file off the end of the line (where such a write lands under a real `HOME` was deliberately
  not measured). Phase 281.1 refuses such a line before the spawn (`SECURITY_LINE_MAX`,
  4,000, in `security.ts`: `keychainWrite` answers false and the runner answers exit 1).

  **CORRECTION (7), PHASE 287, and it moves three of the numbers above.** The buffer counts BYTES and not
  characters, so "past about 4,096 **characters**" is wrong wherever it appears here: a 4,098 byte line of
  4,088 characters hangs while a 4,096 byte line of 4,096 characters writes, and the one component of
  Tortie's line that can carry non-ASCII is the harness keychain path — a scratch path of 100 accented
  letters passed the `.length` cap and the shipping runner sent 4,100 bytes. The cap is therefore
  `SECURITY_LINE_MAX_BYTES` comparing `Buffer.byteLength`, and the name `SECURITY_LINE_MAX` above no
  longer exists. Calling 4,097 intact is also an error: Phase 287's verifier measured it three
  independent ways and 4,097 writes but the closing quote has ALREADY been split off, so the orphan
  prints usage. And "4,098 hangs" is true only of the shape with a trailing keychain path; in the SHIPPED
  shape, which names no keychain, 4,098 and above exits 1 and leaves a CORRUPT ITEM in the keychain, once
  with a payload whose first byte read back `0x07` and once silently one byte short. **That corrupt item
  is the worst outcome of the four and it is the one the byte cap actually prevents.** Where such a write
  lands under a real `HOME` is no longer unmeasured either: it lands in the DEFAULT keychain, because the
  keychain path is what falls off the end. The long-line
  form is **Phase 287** in docs/BACKLOG.md ("the `-i` line above the `security` buffer"), queued by Phase
  281.1: this bullet and the `79c6c8fe` commit body said "queued as its own entry" when no entry existed.

**Corrections after Phase 281.1.** The `79c6c8fe` commit body cannot change; where it and the first
version of this section disagree with what was later measured or found, this section is the record.
(1) Its "queued on its own" for the `-i` write named no entry; Phase 287 is that entry now. (2) The
first bullet above omitted the vendor verifier's second reason and its minimum ask, and softened the
grade; both are carried now and the pin was built. (3) The locked-keychain claim in §8.1 and the
`keychainReader` comment said the deadline was THE route; it is one of three measured. (4) §8's presence
sentence said a locked keychain draws the not-signed-in row; its attributes still read. (5) The decoder's
"printable" table was narrower than the real program's, §8.1 has the measured one. (6) `probe:p281`'s
header claimed nothing but the meter could reach the keychain in its launch; the login list's presence
seam could, through `logins:list` from the meter's hover card, Settings and the add-login modal, and
Chromium's `safeStorage` can with no `security` process; the seam now refuses under `isHarnessLaunch`
(`harnessLoginAccountDeps`) and the header says the rest. (7) §6.2 quoted the operator's user name as an
account literal twice; `p281-literal` now.

## 9. What is NOT in this phase

- No change to the status-line tap, its script, stamp or throttle, or the precedence between the tap and
  the poll. This phase alone will not make the Claude row as steady as Codex.
- No change to `service.ts`'s policies.
- No change to Codex.
- No change to Tortie's vault addressing: vault names pass `null` and keep their argv.
- No miss and failure split in the credentials domain's runner, which still collapses exit codes
  (`security.ts:161-164`), and none for presence.
- `CLAUDE_SECURESTORAGE_CONFIG_DIR` for a chosen login, and for the plaintext file path.
- No deletion, repair or migration of the stray item, and no surface that mentions it. Nothing reads its
  payload, rewrites it or deletes it.
- No cross-account fallback, and no account check before drawing numbers.
- No `security` run against any real keychain by any builder, test or gate, and no `-w` or `-g` anywhere
  real. No release.
