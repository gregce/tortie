# 32 — Phase 18 item 6: the user-visible name audit

**Status:** done, with an executable guardrail.
**Method:** static enumeration of every string literal and JSX text node in
`src/**`, plus a real-app screenshot read on an isolated `--user-data-dir`.
**Test that keeps it true:** `src/renderer/__tests__/user-visible-name.test.ts`.

> Numbered 32 because `docs/research/30` and `31` were already taken
> (`30-specstory-distribution.md`, `31-extensions.md`). The Phase 18 spec said
> "30"; that slot was gone by the time the audit ran.

---

## 1. What this was, and what it deliberately was not

This is an **audit**, not a rename. CLAUDE.md states the stakes plainly: the
identifier strands that live data is bound to must never be renamed, because
renaming the first five strands the operator's running sessions. At the time of
the audit that was **44 live sessions of real work**.

The protected strands, none of which were touched:

| Strand | Where it lives | Why renaming it breaks things |
|---|---|---|
| `-L gmux` | `src/main/tmux/supervisor.ts:53` (`TMUX_SOCKET = 'gmux'`) | The private tmux server's socket. A new name is a new, empty server. |
| `resources/gmux-tmux.conf` | `src/main/tmux/resolve.ts` | The config the server was started with. |
| `@gmux-*` | `src/main/tmux/sessions.ts` | Session options carrying our identity; the second source for "is this ours". |
| `GMUX_SESSION_ID` / `GMUX_MANAGED` | `src/main/tmux/env.ts` | Pane-env stamps. A live session carrying neither is NOT OURS. |
| `<userData>/gmux/` | 6 sites (`activity/hooks`, `drop/store`, `manifest/store`, `restore/login-item`, `restore/snapshots`, `symbols/persist`) | The manifest, snapshots and symbol DB live here. |
| `window.gmux` | `src/preload/index.ts:460` | The one typed preload bridge. |
| `gmux-asset:` | `src/main/assets/protocol.ts` | Registered URL scheme. |
| `gmux.*` localStorage keys | renderer stores | Renaming loses every persisted preference. |
| `gmux-*` CSS classes | renderer styles | Includes `.gmux-terminal-mount`, which the focus and drag hit-tests select on. |

**Verified unchanged by count, HEAD vs. working tree:**

```
-L gmux literal          31 → 31
gmux-tmux.conf           18 → 18
@gmux-*                  32 → 32
GMUX_SESSION_ID          12 → 12
GMUX_MANAGED              6 →  6
window.gmux             152 → 152
gmux-asset:              22 → 22
gmux-* CSS classes    identical (set diff empty)
gmux.* localStorage   19 keys → 21 keys (only ADDITIONS: gmux.dockCollapsed, and
                      gmux.editorFill which exists ONLY in a negative test
                      asserting boot ignores it — no production code reads or
                      writes it, per the spec's "fill is never persisted")
```

`.gmux-terminal-mount` moved files during Phase 18's hoist (TerminalRegion →
`term-focus.ts` / `SessionStrip.tsx`) but the count is 16 before and 16 after:
relocated, not renamed.

---

## 2. Method

A regex over "gmux" returns 664 string literals and is useless — it cannot tell
an env var from a sentence. The audit therefore used a **string-aware
tokenizer** (the same one the test now ships) which:

1. strips line and block comments, but is aware of string context so
   `'https://…'` is not mistaken for a comment — CLAUDE.md exempts comment
   prose by name, and it is the bulk of the noise;
2. extracts every **string / template literal body** and every **JSX text
   node**;
3. removes known technical tokens (env vars, paths, console prefixes, channel
   names, type identifiers, and every protected strand);
4. reports whatever still says "gmux" — that residue is text a user can read.

Counts through the funnel:

| Stage | Count |
|---|---|
| String literals containing "gmux" | 664 |
| …in non-comment code | 304 |
| …after removing technical tokens | 20 |
| …genuine user-visible defects | **5** |

---

## 3. The five defects, and the fixes

All five were pre-existing — none introduced by Phase 18. Two of them are in the
main process, which is why the scan covers `src/**` and not just the renderer.

| # | Site | Was | Now |
|---|---|---|---|
| 1 | `src/main/git/service.ts:1543` | "…**gmux** runs git without a terminal, so it can't ask for a password…" | "…**Tortie** runs git without a terminal…" |
| 2 | `src/renderer/scm/depth.ts:632` | "Branch creation needs a newer **gmux** build" | "…newer **Tortie** build" |
| 3 | `src/renderer/scm/depth.ts:650` | "Tag creation needs a newer **gmux** build" | "…newer **Tortie** build" |
| 4 | `src/renderer/scm/BranchesView.tsx:476` (JSX text) | "Branch management needs a newer **gmux** build." | "…newer **Tortie** build." |
| 5 | `src/renderer/settings/keyboard-conflicts.ts:55` | "A shortcut needs ⌘ or ⌃ to reach **gmux**. Record a different one." | "…to reach **Tortie**." |

Defect 4 is the one a literal string-literal grep misses entirely: it is JSX
text, not a quoted string. That is why the test scans both.

Also changed, as a judgement call rather than a defect: the two keymap invariant
errors in `src/shared/keymap.ts` (`gmux keymap: no entry "…"`) now say
`Tortie keymap:`. They are internal programming-error throws, but a throw that
reaches a crash surface should not name a product that no longer exists. No test
asserted the old text.

---

## 4. What was checked and found already correct

- **Packaging identity.** `package.json` → `productName: Tortie`;
  `electron-builder.yml` → `appId: com.specstory.tortie`, `productName: Tortie`.
  Asserted by the test.
- **About panel.** `app.setAboutPanelOptions({ applicationName: app.name })` —
  derives from `productName`, so it reads "Tortie". No literal.
- **Menu-bar / tray tooltip.** `tray.setToolTip(app.name)` — same derivation.
- **Empty state.** Read live: "Sessions you start keep running even when
  **Tortie** is closed."
- **Login item.** `Launch **Tortie** at login` (`ActivityBar.tsx:123`); Settings
  → General says "Open at login". The `'Launch gmux at login'` hits are two
  doc-comments describing the IPC channel.
- **Copy details / diagnostics.** Already emits `processes: N owned by
  **Tortie**`. The Phase 18 spec pre-authorised diagnostics printing a literal
  `tmux -L gmux …` as a mono code literal; **that allowance was not needed** —
  no diagnostics surface prints the socket command. The only `tmux -L gmux`
  occurrences in `src/` are comments.

### Legitimate "gmux" the audit deliberately leaves alone

- **The project tab reads "gmux"** in every screenshot here. That is the
  *folder name* of the repo being developed (`/Users/gdc/gmux`), interpolated
  as a project title. Not the product name.
- **`src/main/migrate/notice.ts`** deliberately names the old app — its entire
  job is telling the user what happened to the thing that used to be called
  gmux. Saying "Tortie" there would describe the wrong application.
- **`src/main/agents/registry.ts`** — `quirks` / `notes` are
  documentation-as-data addressed to the next registry editor. Verified never
  rendered: no `.notes` / `.quirks` reference exists outside `src/main`.
- **Developer harness output** — `[gmux]`, `[gmux-conf]`, `[gmux-smoke]`,
  `[gmux-shot]` console prefixes and the `GMUX_*` env vars behind them.

---

## 5. The guardrail

`src/renderer/__tests__/user-visible-name.test.ts`, four assertions:

1. **No user-visible string or JSX text says "gmux".** Every candidate must be
   consumed by a `TECHNICAL` pattern (each carrying a `why`) or live in a file
   on `ALLOWED_FILES` (each carrying a `why`). On failure it prints every
   offending `file:line` and the text.
2. **Packaged identity stays Tortie** — `productName` and `appId`.
3. **The protected strands still exist** — asserts `TMUX_SOCKET = 'gmux'`,
   `gmux-tmux.conf`, `@gmux-id`, `GMUX_SESSION_ID`, `GMUX_MANAGED` are present.
   This is the half that guards against the failure mode the Phase 18 brief
   names as risk 10: a later cleanup "finishing off" the rename. If someone
   renames a strand to make assertion 1 pass, assertion 3 fails.
4. **Every allow-list entry has a reason** of real length, so widening the
   allow-list is visible in review rather than silent.

### It was falsified before it was trusted

A guardrail that has never failed proves nothing. Both detection paths were
checked by planting a regression and confirming a named failure:

| Planted | Result |
|---|---|
| `depth.ts` string back to "newer gmux build" | FAIL, `src/renderer/scm/depth.ts:632` |
| `BranchesView.tsx` JSX text back to "newer gmux build" | FAIL, `src/renderer/scm/BranchesView.tsx:475` |
| both reverted | 4 passed |

---

## 6. Live-app evidence

Isolated `--user-data-dir` under the scratchpad, CDP throttling flags, real app,
1440×900.

- **Boot + empty state** — `int-boot.png`. Confirms the renderer boots at all
  (it previously threw at module load on a missing keymap entry) and that the
  first-run copy says Tortie.
- **Full chrome, project + file open** — `int-layout.png`. Titlebar, activity
  bar, sidebar, session strip, editor chrome, SCM pane: no "gmux" anywhere
  except the project tab (the folder name).
- **Collapsed rail + hover card** — `int-rail-card.png`. Card reads
  `pi-1 / pi · idle · 30m / Its conversation comes back after a restart.`

**Operator safety:** every launch on its own `--user-data-dir`; `tmux -L gmux`
only; no `pkill`; the running `/Applications/Tortie.app` untouched. Live
sessions listed before and after: **44 sessions, identical**.

---

## 7. Fix round — the audit had a false negative, and it was hiding a live string

Verifier C found the thing this document said did not exist: a sentence in the
running app that read **"gmux previews images up to 32 MB"**, photographed off
the screen, while the test above passed 4/4.

### The hole

The JSX half of the scan matched text with a regex:

```js
const jsx = /> *([^<>{}]*[A-Za-z][^<>{}]*?) *</g;
```

That only sees text anchored between a literal `>` and a literal `<` **with no
braces in between**. The failing sentence is (`ImageView.tsx:314`):

```jsx
{name} is {formatBytes(source.bytes)}. gmux previews images up to{' '}
{formatBytes(source.capBytes)}, so opening it here would stall the window…
```

The sentence sits *between two interpolations*, so the regex never saw it. This
is a class of hole, not one miss: **any copy with a value in the middle of it**
— which is most copy worth auditing — escaped the audit. Section 5's
falsification exercise did not catch it because both planted regressions were
brace-free strings, i.e. they tested the case the regex could already see.

### The fix

The scanner is now a **TypeScript AST walk** (`ts.createSourceFile`, already a
devDependency, ~0.6 s over the whole tree). It collects, by construction:

| Node kind | What it catches |
|---|---|
| `StringLiteral`, `NoSubstitutionTemplateLiteral` | every quoted string |
| `TemplateHead` / `TemplateMiddle` / `TemplateTail` | every literal chunk of a template, interpolations and all |
| `JsxText` | every text node, **including between interpolations** |

Comments are excluded because they are not nodes — no tokenizer to get wrong.
Module specifiers are skipped (a path that resolves is not a sentence). The
failure report now names the node kind, so a reader can tell a string from JSX
text at a glance.

One TECHNICAL pattern needed widening for a reason worth recording: the AST
hands back `@gmux-` as a bare `TemplateHead` for the `` `@gmux-${string}` ``
type annotation, so `/@gmux-[a-z${}-]+/` had to become `[a-z${}-]*`. That is the
parser being more precise than the regex was, not a loosening.

### Falsified again, on the string that beat the old scanner

| Planted | Old regex scanner | New AST scanner |
|---|---|---|
| `ImageView.tsx:314` back to "gmux previews images up to" | **PASS (4/4)** — the false negative | **FAIL**, `src/renderer/editor/image/ImageView.tsx:314 (jsx-text)` |
| reverted | 4 passed | 4 passed |

The whole-renderer AST sweep found exactly one JSX-text hit, and this was it.

### The two remaining strings, fixed by hand

Neither is reachable by any scanner: both are exempted by a legitimate
TECHNICAL pattern (`gmux-tmux\.conf`, `window\.gmux`), because both genuinely
contained a protected identifier. They were judgement calls, and the judgement
went the way the phase brief asked.

| Where | Was | Now |
|---|---|---|
| `src/main/tmux/supervisor.ts:84` | `gmux-tmux.conf is missing from the application bundle.` | `Tortie's tmux configuration is missing from the application bundle. Reinstalling Tortie will restore it.` |
| `src/renderer/terminal/TerminalPane.tsx:153` | `window.gmux is missing — preload did not load.` | `This window did not finish loading, so it cannot show your sessions. They are still running — quit Tortie and open it again.` |

The supervisor string reaches a **toast verbatim** through `errorText()`, so it
is product copy, not a log line; the exact path still travels in `detail`, where
a bug report can find it. The TerminalPane string named an identifier the user
cannot act on — the useful thing to say in that state is that the *window* is
broken and the *sessions* are not (PRODUCT.md P1), so that is what it says now.

`tmux -L gmux` in Diagnostics stays, as a mono code literal, for the reason
section 4 gives. Nothing else changed; no identifier strand was touched.

### Re-verified in the running app

Verifier C's own repro: a 43,215,598-byte PNG in a scratch project, opened
through the real editor, Image mode.

```
title: "This image is too large to preview"
body:  "big.png is 41 MB. Tortie previews images up to 32 MB, so opening it
        here would stall the window rather than show you anything."
```

Screenshot read, not merely captured:
`scratchpad/fixround/image-too-large.png`. **44 sessions before, 44 after.**
