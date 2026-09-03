# Research 79: what Claude Code 2.1.259 does around its credential, read from the bundle

Answers the measurement step the Phase 211 entry in `docs/BACKLOG.md` puts first, and it was
written by the fix round because the phase shipped its numbers in a comment and never wrote this
file. Everything below was read from bytes on disk in the installed vendor binary, being
`/Users/gdc/.local/share/claude/versions/2.1.259` (200,225,968 bytes, an arm64 bundle), with `grep
-boa` for the identifier and `dd` for the bytes around it. **No vendor process ran.** No credential
of the operator's was read, written or copied. His keychain was inventoried by attributes alone, with
no `-g` and no `-w`, before and after every run the round made.

Every number the Phase 211 face and lock module carry is here with the identifier and the byte
offset it was read at, so a later vendor build can be re-read against the same table.

## 1. The keychain read cache, which is what "about half a minute" is

| What | Identifier | Offset | Bytes |
| --- | --- | --- | --- |
| The cache bound | `S8t` | 158840519 | `var S8t=30000;class i{cache={data:null,cachedAt:0};...}` |
| The read that honours it | keychain `read()` | 158845461 | `if(Date.now()-r.cachedAt<S8t)return r.data;` |
| The invalidation before a refresh | `JA()` | 158840579 | `n.cache={data:null,cachedAt:0},n.generation++,...` |
| The account attribute | `Hv()` | 158840579 | `process.env.USER||u().username`, else `claude-code-user` |
| The service name | `Gx(n)` | 158839953 | `Claude Code${OAUTH_FILE_SUFFIX}${n}${c}`, `c` being `-` plus the first eight hex of sha256 of the config dir when `CLAUDE_CONFIG_DIR` is set |
| The storage config dir | `z_()` | 158839953 | `CLAUDE_SECURESTORAGE_CONFIG_DIR` when set, else the config dir |

So a running Claude Code on macOS reads its keychain item at most once per thirty seconds, and a
credential Tortie writes into that item is read on the first read after the cache expires. The face
says *within about half a minute* and that is this constant. The README of claude-swap says the same
sentence; this table is what makes it a reading rather than a quotation.

**What is NOT measured, stated plainly.** The entry asked for a second measurement, being a real
`claude` process on a scratch login reporting a swapped credential, timed from the write. It was
not taken. It would need a scratch keychain FIRST in the process's search list, and on macOS the
search list is per user and not per process, so putting it there is `security list-keychains -s`
against the operator's own search list, which the round's rules refuse. It would also need the
process to report its credential without a network turn, which `/status` does not do without an
account behind the token. So the pickup on a live process is **UNMEASURED** here, the bundle's
constant is what ships, and the operator's acceptance step in the entry is the one reading that can
confirm it: open a session on the default login, `/status`, choose the other account, wait the time
the line says, `/status` again.

## 2. The locks a credential write cooperates with

| Lock | Identifier | Offset | Options |
| --- | --- | --- | --- |
| Primary refresh lock `<config-dir>/.oauth_refresh.lock` | `ukn(e,n)` | 159814708 | `realpath:!1, stale:60000, update:5000` |
| Legacy lock `<realpath of config-dir>.lock` | `ecr(e)` | 159815009 | same options, `lockfilePath: y` where `y = \`${await epe(e).catch(()=>e)}.lock\`` |
| `epe` | import | 159082821 | `realpath as epe` |
| Secure storage write lock `<storage config dir>/.storage-write` | the storage `run` | 158843688 | `realpath:!1, retries:{retries:10,minTimeout:100,maxTimeout:1000}, stale:15000` |
| `~/.claude.json.lock` | proper-lockfile defaults `Nt` | 158835862 | `stale:1e4, update:null, realpath:!0, retries:0`, so stale 10 s touched every 5 s |

The refresh path (`T_`, the retry loop at 159817436) takes the primary, then the legacy, releasing
the primary and retrying on `ELOCKED` from the legacy with telemetry
`tengu_oauth_refresh_legacy_lock_contended`. It retries a held lock five times with
`1000+Math.random()*1000` ms between tries (`n<5` and `Lpe=5`), then reports `lock_busy` or
`lock_timeout`. Inside the locks it re-reads the credential (`Gw()` then `readAsyncStrict`) and, if
the access token moved, abandons the refresh as `race_resolved`. That double checked re-read is why a
holder that swaps the credential under the locks is safe: the vendor sees the new token and stops.

The save at the end of a refresh, `YUe` at 159801910, goes through `Tn().mutate(...)`, which is the
storage read modify write `m()` at 158843688 under `.storage-write`, NOT under the refresh lock
alone. So a write that holds the two credential locks and not the storage lock can still land inside
the vendor's own read modify write, in the window between its read and its update, and be
overwritten with the old credential. The MCP OAuth refresh at `mcp-refresh-<name>.lock` (185570837,
185762619) writes the same blob the same way. That is the third lock Phase 211's first build did not
take and the fix round does.

The lock artifact under proper-lockfile is a DIRECTORY; `mkdir` is the mutex. A holder touches its
mtime every `update` ms. A waiter treats a directory older than `stale` as a dead holder's and
removes it. Tortie's port in `src/main/credentials/locks.ts` takes the three in the vendor's order,
with the vendor's staleness for each, a toucher at 3 s, a nine second bounded wait per lock that
refuses rather than steals, and an immediate refusal when the directory cannot be made at all.

## 3. What was measured on scratch, and what it showed

Every arm ran over real directories and real locks under a scratch root, with holders of the
round's own writing, never the vendor, never his files.

| Arm | Reading |
| --- | --- |
| A live holder touching every second, four seconds | activate waited 3,946 ms, wrote after the release, never stole |
| A holder of ONLY `.storage-write` doing the vendor's read modify write | shipped: the store ended holding the chosen account; storage lock ablated: activate wrote at 141 ms and the holder's refreshed old credential overwrote it |
| A stale lock, mtime 70 s old | reclaimed in 104 ms |
| A lock with an mtime in the future | refused after 3.2 s, directory intact, the sentence naming the lock |
| A config home with mode 555 | refused in 0 ms with 0 ms of CPU (the first build: 2,001 ms at 99 percent of a core) |

## 4. What this file does not claim

It does not claim the numbers hold for any build but 2.1.259. It does not claim a live process picks
up a swap in thirty seconds, because that was not driven. It does not name a command, a host or a
binary Tortie runs, and it directs nobody to run anything: it is a table of what one file on disk
says about itself.
