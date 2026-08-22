# Research 62 reference implementation

Four files, 603 lines, no dependencies, Node built-ins only. Every read is read only and
nothing here writes to disk. This is the code the numbers in `docs/research/62-session-overview.md`
were taken with, kept so a builder can rerun them rather than trust them.

| File | Lines | What it is |
|---|---|---|
| `overview.mjs` | 452 | The deterministic extractor. Four agent reducers, being claude, codex, grok and antigravity, plus the incremental fold and the snapshot. `PARSER_VERSION = 3` |
| `card.mjs` | 60 | The zero model readout. The engine builds the whole string. Nothing on it is generated |
| `resolve.mjs` | 31 | Manifest row to store path, by path arithmetic from the registry patterns. Needs a COPY of `manifest.db` named `manifest-copy.db` in the working directory |
| `measure.mjs` | 60 | The cold fold, the warm recheck, and the git versus transcript overlap |

## Running it

```
cp "<userData>/gmux/manifest.db" ./manifest-copy.db     # a copy, never the live file
node resolve.mjs > fleet.tsv
grep '/Users/you/project' fleet.tsv | cut -f1,6 > project.tsv
node measure.mjs project.tsv /Users/you/project
```

## What this is not

- It is not the recommended design. The document recommends candidate D, whose outcome
  substrate is git rather than the transcript. Nothing here reads git except `measure.mjs`,
  and that only to measure how much the transcript layer misses.
- It covers 4 of the 13 agents in `src/main/agents/registry.ts`. There is no universality
  claim anywhere in it.
- `overview.mjs` carries a byte offset fold with a rewrite guard and a truncation guard. The
  document recommends NOT building that, because a rebuild whole cache keyed on
  `(path, size, mtime, parserVersion)` is correct by construction and the fold is not needed
  until some later phase needs the record to be current while the page is closed. The fold is
  kept here because it was proved byte identical on 12 real transcripts over 10 growth passes
  each, and reproving it would be expensive.
- The lab's fixture corpus was 110 MB of the operator's own transcripts and a copy of his
  manifest. It was deleted rather than committed. Point these scripts at your own logs.
