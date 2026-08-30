# Research 69: what owns the bytes in Tortie's Chromium caches

Phase 166. Written 2026-08-29 from measurements on scratch profiles under a worktree at `8767fb7`,
Tortie 0.85.1, Electron 43.3.0, Chrome 150.0.7871.212. The operator's own profile was never read;
its three numbers, being 871 MB of HTTP cache, 270 MB of code cache and 69 MB under `gmux`, come from
the audit of 2026-08-26 and are the only figures from it in this document.

## 1. The question, and the answer in one paragraph

The audit found 1.14 GB of Chromium cache beside 69 MB of Tortie's own durable data, measured on an
unusually active day, so the growth rate was unknown and the charter said attribution comes before any
deletion. The answer is that the shipped app writes nothing to either cache. Every application resource
is a `file:` URL, every project image is a `gmux-asset:` URL and every preview resource is a
`gmux-preview:` URL, and Chromium stores none of them: its file loader and Electron's custom scheme
loader bypass the HTTP cache, and V8 writes a code cache entry only for http(s) scripts unless a scheme
declares `codeCache: true`, which none of Tortie's schemes do. Thirty launches, five simulated version
changes, five openings of a document carrying 49 MB of images, the image viewer, the recovery strip
and the editor all left both caches at zero entries. The one shape that writes is the dev shape, where
the renderer is served by the vite dev server over http, and there the growth has three classes, all of
them attributed by origin: the modules of a fresh page, the pre bundled dependencies after a
re-optimization, and the hot updates an edit pushes to an open window, at about 300 KB per edit and
never invalidated. The policy that shipped is one switch, a 128 MiB ceiling on the HTTP cache in the
dev shape, and no deletion anywhere.

## 2. How resources reach the renderer, and where the caches live

- Packaged and `out/` launches: `win.loadFile(out/renderer/index.html)` in `src/main/index.ts`, so every
  app resource is a `file:` URL. Dev launches: `win.loadURL(ELECTRON_RENDERER_URL)`, so every app
  resource is `http://localhost:<port>/...` from vite.
- `gmux-asset:` in `src/main/assets/protocol.ts` answers with `net.fetch(pathToFileURL(real))`, sets no
  cache header, and is registered `standard, secure, supportFetchAPI, stream, corsEnabled` with
  `codeCache` unset. Its header comment says it "streams from disk through Chromium's own cache". That
  sentence is wrong: nothing it serves is stored, measured in section 4.
- `gmux-preview:` in `src/main/preview/protocol.ts` answers every response with `cache-control: no-store`.
- No other user of the default session's network exists under `src/main`. The renderer's CSP blocks
  remote origins. The verifier attacked this sentence with the one remote fetcher the app has, the
  updater under `src/main/updates/`: electron-updater makes its requests on its own partition,
  `session.fromPartition("electron-updater", { cache: false })`, so an update check or a downloaded
  installer never enters the default session's HTTP cache either. That attack failed to break the
  attribution.
- Under the profile: `Cache/Cache_Data/` is the HTTP cache, Chromium's simple backend, one `<hash>_0`
  file per entry whose 24 byte header is followed by the key, which is the resource URL. `Code Cache/js/`
  and `Code Cache/wasm/` use the same backend, where a key is either `_key<url>\n<origin>` for the stub
  naming a script or a 64 character content hash for the body holding the bytecode. `GPUCache`,
  `DawnGraphiteCache` and `DawnWebGPUCache` hold 548 KB each and never move.

## 3. What Chromium and Electron allow

- Electron 43.3.0 exposes `ses.clearCache()`, `ses.clearCodeCaches()`, `ses.getCacheSize()`,
  `ses.setCodeCachePath()` and `ses.clearData()`. Tortie calls none of the deletions and
  `build/assert-cache-policy-never-deletes.mjs` keeps it that way.
- `--disk-cache-size=<bytes>` is read by Electron into `max_cache_size_` in
  `shell/browser/electron_browser_context.cc` and handed to the network context as
  `http_cache_max_size`. It bounds the HTTP cache only. The code cache size is what
  `GetGeneratedCodeCacheSettings` returns, which in Electron is `{true, 0, path}`, meaning Chromium's own
  heuristic, and no switch or API reaches it.
- Chromium's ceilings, from `net/disk_cache/cache_util.cc` at tag 150.0.7871.212: `kDefaultCacheSize`
  is 80 MiB; the HTTP cache on non Windows scales it 400 percent with a hard limit of four times that, so
  1,280 MiB; the code cache stays at 100 percent with a hard limit of 320 MiB. Both ceilings drop when the
  volume has under about 32 GB free. The audit's 871 MB and 270 MB are therefore an HTTP cache still
  under its ceiling and a code cache close to its own, and the growth was already bounded at about
  1.6 GB combined.

## 4. Reproduction, on scratch profiles

All sizes are `du -sk` and every entry count is a walk of the profile by the measuring script, never a
number the app reported. Every launch went through `build/electron-run.mjs` on a scratch tmux socket.

### A. Twenty launches of one build, `file:` shape

| launch | http cache | code cache | gmux | profile |
| --- | ---: | ---: | ---: | ---: |
| 1 | 0 KB, 0 entries | 16 KB, 0 entries | 280 KB | 2,112 KB |
| 2 | 0 KB, 0 entries | 16 KB, 0 entries | 360 KB | 2,200 KB |
| 3 | 0 KB, 0 entries | 16 KB, 0 entries | 444 KB | 2,284 KB |
| 4 | 0 KB, 0 entries | 16 KB, 0 entries | 524 KB | 2,364 KB |
| 5 to 20 | 0 KB, 0 entries | 16 KB, 0 entries | 604 KB | 2,444 KB |

The 16 KB of code cache is two empty index directories. The only growth under `gmux` is the manifest's
own backup rotation, which keeps five and plateaus at launch 5.

### B. Five simulated version changes on the same profile

Each round edited one string in `src/renderer/app/HomeScreen.tsx`, rebuilt with `electron-vite build`
in about 20.5 s, which renamed 24 hashed assets, then launched once. After every version: http cache
0 KB and 0 entries, code cache 16 KB and 0 entries, profile 2,444 KB. The proof harness in section 8
simulates the same thing without a rebuild, by copying the entry script and stylesheet under a new hashed
name and pointing `index.html` at them, and gets the same zero.

### C. A markdown document with 48.9 MB of local images, opened in preview five times

Twenty 800x800 random pixel PNGs of 2.4 MB each, referenced from one page, driven through the shot
harness with `editorMode: 'preview'`. Every open: 20 `img[src^="gmux-asset:"]` elements, 20 complete with
`naturalWidth > 0`, photograph showing them drawn, http cache 0 KB and 0 entries afterwards, renderer
heap 18.2 MB flat. Resource Timing holds zero entries for the custom scheme, so the reload latency was
measured another way in section 8.

### D. The dev shape, renderer served by vite over http, five launches

| launch | http cache | code cache | profile |
| --- | ---: | ---: | ---: |
| 1 | 21,084 KB, 570 files | 2,212 KB, 550 files | 25,412 KB |
| 2 | 21,084 KB, 570 files | 18,680 KB, 782 files | 41,968 KB |
| 3 to 5 | 21,084 KB, 570 files | 18,680 KB, 782 files | 42,212 KB |

V8 writes the bytecode on the second sighting of a script, which is the jump at launch 2, and then both
caches hold still.

### E. Ten hot edits under an open dev window

Before: http 21,084 KB in 570 files, code 18,680 KB in 782 files. After ten edits three seconds apart:
http 24,172 KB in 615 files, code 18,860 KB in 827 files. That is 3,088 KB of HTTP cache and 180 KB of
code cache for ten edits, about 330 KB per edit, as 50 new `?t=<timestamp>` entries, being twelve each for
`app/HomeScreen.tsx`, `app/EmptyStates.tsx`, `app/App.tsx` and `app/TerminalRegion.tsx` and two for
`main.tsx`. Vite refetches the edited module and every importer up to the hot module boundary under a new
URL, and the old entries are never invalidated.

### Cross check against Chromium's own number

A real Phase 163 capture on the dev profile reported `session.getCacheSize()` of 24,014,592 bytes against
the walk's 24,172 KB by `du` and 23,012 KB summed over entry files, and a code cache of 19,333,120 bytes
against 18,860 KB. The report line and an independent walk agree within five percent.

## 5. Attribution

Shipped shape, thirty launches plus five image opens plus the viewer, the recovery strip and the editor:
0 bytes in both caches, 100 percent attributed to nothing, because nothing Tortie serves over `file:`,
`gmux-asset:` or `gmux-preview:` is stored.

Dev shape, after section E, HTTP cache 23,296 KB in 620 files:

| class | KB | files |
| --- | ---: | ---: |
| dev server, all | 23,282 | 616 |
| of which pre bundled deps `.vite/deps/*?v=<hash>` (react-dom 3,088 KB, monaco 2,034 KB, xterm 422 KB) | 7,342 | 28 |
| of which hot updates `?t=` from ten edits | 3,329 | 50 |
| of which app source modules under `/src/renderer/` | about 12,000 | about 530 |
| of which the vite client and react refresh | 285 | 2 |
| index and bookkeeping, no key | 15 | 4 |

Code cache 18,860 KB in 827 files: 596 URL keyed stubs of 2,674 KB, every one naming the dev server's
origin and no other, plus 232 content hash keyed bodies of 14,399 KB holding their bytecode. 100 percent
attributed to dev server scripts by origin.

Which class grows with what: launches, nothing after launch 2 in dev and nothing at all in the shipped
shape. Versions, nothing in the shipped shape; in dev each dependency re-optimization writes a fresh
`?v=` set of about 7.3 MB plus its bytecode. Project images, nothing. Edits under a live dev window,
about 300 KB each, unbounded until Chromium's own ceiling.

## 6. What this says about the audit's 1.14 GB

An inference, because his profile is unread. The shipped shape cannot have written it. His profile is
shared with his dev runs, whose renderer is served from `http://localhost:5173`, and the only classes that
grow are dev server modules, hot updates and re-optimized dependencies. 871 MB at about 300 KB per edit is
roughly 2,900 hot updates, which is what agents rewriting renderer files under an open dev window produce
over a working week. He can confirm it in one command on his own machine:

    strings "$HOME/Library/Application Support/Tortie/Cache/Cache_Data/"<any entry file> | head -2

If it prints `localhost:5173`, the attribution holds. Product users never see this growth.

## 7. The policy, and what was rejected

The policy is `src/main/cache/policy.ts`. In the dev shape, being an unpackaged launch with
`ELECTRON_RENDERER_URL` set, it appends `--disk-cache-size=134217728` before `whenReady`, which keeps
about six generations of a 21 MB dev page warm and ends the unbounded growth. In every other shape it
appends nothing and logs one line. It imports no file system module and deletes nothing, and
`npm run gate:cache-policy` pins both. The diagnostics report says which mode a launch runs under, what
the ceiling is and what the cache can hold, and the report tab draws the ceiling as one row.

Rejected, with the measurement that rejected each:

- Response cache headers on `gmux-asset:` and `file:` resources. They are never stored, so a header
  changes nothing. Section 4C.
- A product wide `--disk-cache-size`. It bounds nothing that exists in the shipped shape. Section 4A.
- Version aware retirement of obsolete entries. There are no obsolete entries in the shipped shape, and in
  dev the obsolete `?t=` entries are Chromium's to evict inside its ceiling. Sections 4B and 4E.
- `clearCodeCaches` at dev boot. It is deletion without a measured need, and V8 rewrites 16 MB on the
  next launch. Section 4D launch 2.
- Anything on a timer. The Phase 152 lesson, and nothing here has a cost worth paying on a timer.

## 8. The proof harness and its numbers

`npm run probe:p166` runs `build/probe-p166-cache.mjs` through the harness socket. It makes its own
scratch project, launches the built app through `build/electron-run.mjs` on profiles of its own, and grades
the audit's five proofs plus the one absolute. The run recorded here is the full one, being twenty
launches, five versions, five opens, three dev launches, ten edits and two ceiling launches, 40 Electrons in
all. A run writes `out/p166/p166-report.json` by default; the run recorded here wrote its report and its 40 photographs under the phase's scratch directory, `P166_OUT_DIR`.

Full run on 2026-08-29, 305.7 s wall, 40 Electrons launched and 0 left by the probe, the operator's
session count 46 before and 46 after.

**A, twenty launches.** Every launch: http cache 0 KB and 0 entries, code cache 16 KB and 0 entries,
the renderer's origin `file://`, 0 resources over http(s), profile 2,444 KB from launch 5. Plateau from
launch 3. `gmux` 280, 360, 444, 524, 604 KB then flat, which is the manifest keeping five backups.

**B, five versions.** Each round the page loaded `index-p166v<N>-<hash>.js`, read from
`document.scripts`, and both caches stayed at 0 entries. `index.html` and the assets directory were
byte for byte what they were before the round.

**C, the image document opened five times.** Every open drew 20 of 20 images, and the images were
already complete when the drive handed over, so the wait was 0 ms. Twenty reloads per open through
`gmux-asset:` with a cache busting query, each a real read of a 2.4 MB PNG through the handler, timed
by `Image.decode()`:

| open | reload p50 | reload max | renderer private before | after 20 reloads | JS heap |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 4 ms | 8 ms | 140.8 MB | 172.2 MB | 18.2 MB flat |
| 2 | 3 ms | 6 ms | 141.1 MB | 164.7 MB | 18.2 MB flat |
| 3 | 4 ms | 8 ms | 140.3 MB | 164.2 MB | 18.2 MB flat |
| 4 | 4 ms | 7 ms | 139.7 MB | 164.1 MB | 18.2 MB flat |
| 5 | 4 ms | 8 ms | 141.9 MB | 168.0 MB | 18.2 MB flat |

The private memory a fresh open starts at is flat across the five, so nothing is retained from one
open to the next. The rise within an open is the twenty decoded bitmaps the reload test itself creates,
about 51 MB undecoded, of which 23 to 31 MB was resident when read. The http cache held 0 entries after
every open, so an image is read from disk every time and the reload cost is the 4 ms above.

**D, the other surfaces, offline.** With the window put offline over CDP by the shot harness, so
that `navigator.onLine` read false, the image viewer drew the 800 px PNG with the recovery strip beside
it reading "4 saved sessions", the editor mounted Monaco on the TypeScript file with its 4 lines, no
resource came over http(s) in either, and both caches stayed at 0 entries. The first run of this probe
had the offline knob in the harness and never turned it; the verifier found that and turned it.

**E, the dev shape.** Three launches over a scratch copy of the renderer source served by vite's Node
API on port 5197:

| launch | http cache | code cache | of which bytecode bodies |
| --- | ---: | ---: | ---: |
| 1 | 22,340 KB, 566 entries | 2,212 KB, 546 entries | 0 |
| 2 | 22,340 KB, 566 entries | 18,748 KB, 778 entries | 14,098 KB, 232 files |
| 3 | 22,340 KB, 566 entries | 18,748 KB, 778 entries | 14,098 KB, 232 files |

Every HTTP entry carried the scratch server's origin: 28 pre bundled dependency entries of 7,347 KB,
the rest app modules. Plateau from launch 2. Ten hot edits under one open window then added
3,013,460 bytes as 40 hot update entries, being 301,346 bytes per edit, and 48 KB of code cache. The
first attribution's 330 KB per edit was measured on the worktree's own source with a different
module graph and the two agree to within ten percent.

**F, the ceiling reaches Chromium.** A fresh dev profile launched with the policy's probe override at
4 MiB held 2,868 KB in 115 entries after the first launch and 3,692 KB in 104 entries after the second,
against 20,729,233 bytes for the same page uncapped, being 17 percent. Chromium's simple backend evicted
inside the ceiling and did not overshoot it; the open question about overshoot is answered at this size.

**G, the report line.** In the `file:` shape the capture read `getCacheSize` 0 bytes, ceiling null,
mode `chromium-default`, and the text carried `http cache ceiling Chromium default, up to 1280.0 MB
(chromium-default)`, `http cache holds nothing Tortie serves; file:, gmux-asset: and gmux-preview:
resources bypass it` and the policy line. In the dev shape it read 24,232,960 bytes against the walk's
24,052,226 bytes in entry files, a ratio of 1.008, ceiling 134,217,728, mode `dev-ceiling`, and the text
carried `http cache ceiling 128.0 MB (dev-ceiling)` and `http cache holds dev server modules and hot
updates only`.

**The one absolute.** 39 snapshots of `<profile>/gmux`, one after every launch on every profile, every
file hashed. Nothing was removed except manifest backups the manifest's own rotation retired,
`backups/manifest.db.000001` through `000028`, and every path that changed was one of Tortie's own
durable writers: `manifest.db`, `backups/`, `hooks/port`, and the nine files under `config/` the agent
registry writes out at every boot. The ceiling run, where Chromium was evicting, moved nothing under
`gmux` but those.

## 9. Corrections to the first attribution report

The attribution report this phase was built from was right on every number that mattered, and three of
its sentences need correcting.

1. It said the only change under `gmux` across the twenty launches was the manifest's own backup
   rotation. The byte for byte watch in section 8 shows Tortie also rewrites `gmux/config/README.md`,
   `gmux/config/agents.schema.json` and the seven example files at every boot, and rewrites `hooks/port`
   and `manifest.db`. None of that is growth and all of it is Tortie's own durable layer, but "only the
   backups changed" was not true byte for byte.
2. It left the reload latency of `gmux-asset:` images as an open question because Resource Timing holds
   no entry for a custom scheme. It is measurable from the page with `Image.decode()` on a cache busted
   copy of each URL, which is a real read through the handler, and section 8 has the numbers.
3. It described `gmux-asset:` as streaming "through Chromium's own cache", quoting the handler's own
   header. The handler's header is what is wrong, and it should be corrected when that file is next
   touched: nothing served by the scheme is stored.

One claim was left as a claim because it was not measured: whether Chromium's simple backend evicts
promptly at a ceiling or overshoots. Section 8 measured it at a 4 MiB ceiling.

## 10. Open questions, not invented

1. His profile is unread. One `strings` line on his side settles the 1.14 GB.
2. Whether he wants the dev cache bounded at 128 MiB or some other figure. The number keeps about six
   dev page generations; the switch takes any byte count.
3. Free space on his volume. Under about 32 GB free Chromium's default ceilings drop, so his effective
   default may have been lower than 1,280 MiB.
4. Logs under `<userData>/gmux/logs` were not a growth class in these runs and were not measured over
   days. The audit's remainder beyond the two caches and `gmux` is unattributed here beyond the 1.6 MB of
   GPU caches.
