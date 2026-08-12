# 27 — What the gmux → Tortie rename does to the user's data (measured)

Banked for the rest of Phase 16.5 so the agents that rename `productName`,
`appId` and the UI copy inherit measurements instead of re-deriving them.
Everything below was measured on the reporting machine (macOS 24.6.0, Electron
43.3.0, better-sqlite3 13.0.3) on 2026-08-11, against the real install and a
built fixture — never by reasoning about the docs.

## 1. The blast radius of `app.setName`

`app.getPath('userData')` is `join(app.getPath('appData'), app.getName())`. The
rename therefore repoints, in one step:

| what | where | what its loss looks like |
| --- | --- | --- |
| session manifest | `<userData>/gmux/manifest.db` (+ `-wal`, `-shm`) | every durable session unrestorable; live tmux sessions become unadoptable because nothing proves gmux owns them |
| scrollback snapshots | `<userData>/gmux/snapshots/*.txt` | restores come back blank |
| claude activity hooks | `<userData>/gmux/hooks/**` | status oracle degrades |
| dropped images | `<userData>/gmux/dropped-images/**` | image references in old conversations dangle |
| symbol index | `<userData>/gmux/symbols.db` | rebuilt on demand (harmless) |
| settings + **hotkeys** + window bounds | `<userData>/settings.json` | agent hotkeys, default agent, scrollback limits reset |
| one-time tips, tree state, ⌘P recents | `<userData>/Local Storage/leveldb/**` (renderer localStorage) | first-quit toast and friends return |

Measured profile shares (real install, 828 MB total): `Cache` 749 MB,
`Code Cache` 68 MB, `GPUCache` 5.6 MB, **`gmux/` 4.4 MB**, `Local Storage`
80 KB, `settings.json` 434 B. Copying the regenerable Chromium tier would make
the upgrade ~600× more expensive for nothing, so the migration denylists it.

## 2. Copying a live SQLite manifest

- A **readonly** connection can run `VACUUM INTO` (verified against the real
  40-row manifest carrying a 2.7 MB WAL). The output is one self-contained file
  holding every committed transaction, including WAL content, and the source
  `.db`/`-wal` are byte- and mtime-identical afterwards.
- The only trace a readonly reader leaves on the source is a read-mark inside
  the `-shm` shared-memory index (same size, same mtime, different bytes), and
  a readonly open of a WAL database with no `-shm` present will create one.
  Bookkeeping, never data — but it is why "the original is untouched" is
  asserted excluding `-shm`.
- A naive three-file `cp` of a live WAL database can be TORN (the `.db` and the
  `-wal` are read at different instants). This matters concretely: the upgrade
  case is a user launching Tortie.app without quitting gmux.app.
- `VACUUM INTO` output is not in WAL mode; `openGmuxDatabase()` sets
  `journal_mode = WAL` on first open, so this self-corrects.

Strategy the migration uses: raw byte-for-byte copy (sha256-verified) when
there is no live WAL; `VACUUM INTO` snapshot when there is.

## 3. Timings

Real install, app running (live writer), 41 sessions, 3.0 MB WAL, 44
snapshots: **34 ms**, 94 files, 1.3 MB copied, 8 top-level entries skipped as
regenerable. The migration is not a startup cost worth optimising.

## 4. Hazards the rename agents still own

- **The tmux socket stays `-L gmux`.** Nothing in the migration reads it.
  Renaming it orphans every live session at upgrade.
- **The inner `<userData>/gmux/` directory keeps its name.** It is internal;
  every reader expects it; renaming it would be a second migration for nothing.
  The migration marker is `<userData>/.userdata-migration.json`.
- **`GMUX_SESSION_ID` / `GMUX_MANAGED` pane markers stay.** They are the second
  identity source at reconcile (`sessions/core.ts identify()`); changing them
  strands any session created before the change.
- **Bundle-id change resets macOS grants** and the SMAppService login item is
  registered under the old id (`restore/login-item.ts`). Re-register, and say
  so once, plainly.
- **Captured rows record an absolute specstory path** inside the old bundle.
  Verified during this phase, not assumed: `armableResumeArgv()` re-resolves a
  missing bin and re-wraps under today's binary — driven in `GMUX_SMOKE=migrate`
  against a row recorded at
  `/Applications/gmux.app/Contents/Resources/bin/specstory` (absent on this
  machine), which re-armed under the resolvable copy with the conversation id
  intact. The rows are audited and logged by the migration, never rewritten.
- **`--user-data-dir` is not a rename.** Every smoke script passes one; the
  migration refuses to run whenever userData is not the default location for
  the current app name, or the app's data would be its own source.

## 5. How to re-run the proof

```
npm run smoke:migrate                       # fixture + live tmux + captured row
GMUX_MIGRATE_FIXTURE="$HOME/Library/Application Support/gmux" \
  GMUX_SMOKE=migrate npx electron . --user-data-dir=/tmp/gmux-smoke-migrate
```

The second form additionally rehearses against a real install. It only ever
READS its source; the copy is made into a scratch root and deleted immediately.
