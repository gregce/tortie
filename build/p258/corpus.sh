#!/bin/bash
# Phase 258 — the corpus for `npm run probe:p258`.
#
# Two local copies made with `git clone --no-hardlinks --local`, and nothing
# public: the checkout the probe is run from as `tortie` and /Users/gdc/stoa
# as `stoa`. Both sources are only ever a clone SOURCE; nothing is written to
# either, and the probe refuses a target equal to the checkout it runs IN.
#
#   build/p258/corpus.sh <scratch-dir> <this-checkout>
#   build/p258/corpus.sh <scratch-dir> clean
#
# Writes nothing outside <scratch-dir>/repos. A failure part way through
# removes what it made; `clean` removes every clone. The probe calls `clean`
# in its finally block whatever happened.
#
# TWO DIRECTORIES ARE REFUSED BY NAME. /Users/gdc/runstory and
# /Users/gdc/specfactory were read once, one HTML file each, under the narrow
# lift research 118 §1 records, and that lift is over. Passing either as a
# source, or as the scratch directory, exits 2 before anything is cloned.
set -uo pipefail
SCRATCH="${1:?usage: corpus.sh <scratch-dir> <this-checkout>|clean}"
CHECKOUT="${2:-}"
for forbidden in /Users/gdc/runstory /Users/gdc/specfactory; do
  case "$SCRATCH/" in "$forbidden"/*) echo "[corpus] REFUSED: $forbidden is never read or written"; exit 2;; esac
  case "$CHECKOUT/" in "$forbidden"/*) echo "[corpus] REFUSED: $forbidden is never read"; exit 2;; esac
done
KEEP=0
cleanup() {
  if [ "$KEEP" = "0" ]; then
    echo "[corpus] removing $SCRATCH/repos"
    rm -rf "$SCRATCH/repos"
  fi
}
if [ "$CHECKOUT" = "clean" ]; then
  trap cleanup EXIT
  exit 0
fi
if [ -z "$CHECKOUT" ]; then echo "[corpus] usage: corpus.sh <scratch-dir> <this-checkout>|clean"; exit 2; fi
trap cleanup EXIT
mkdir -p "$SCRATCH/repos"

copy_local() {
  local name="$1" src="$2"
  local dst="$SCRATCH/repos/$name"
  if [ -d "$dst/.git" ]; then echo "[corpus] have $name"; return 0; fi
  # Asked of git rather than of a `.git` directory, because a linked worktree
  # (`git worktree add`) carries a `.git` FILE and is a repository all the same.
  if ! git -C "$src" rev-parse --is-inside-work-tree >/dev/null 2>&1; then echo "[corpus] SKIP $name: $src is not a repository"; return 0; fi
  echo "[corpus] copying $name (read-only source $src)"
  git clone --no-hardlinks --local "$src" "$dst" >/dev/null 2>&1 || { echo "[corpus] FAILED $name"; return 1; }
}

copy_local tortie "$CHECKOUT" || exit 1
copy_local stoa /Users/gdc/stoa || exit 1

KEEP=1
echo "[corpus] done"
du -sh "$SCRATCH/repos"/* 2>/dev/null
