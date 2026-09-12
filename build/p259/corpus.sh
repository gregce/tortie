#!/bin/bash
# Phase 259 — the corpus for the semantic measurement and for `npm run probe:p259`.
#
# ONE local copy made with `git clone --no-hardlinks --local`: the checkout the
# run is started from, as `tortie`. Nothing public, nothing of anybody else's,
# and no second repository — the operator's word of 2026-09-12 covered THIS
# repository and a second is added at his word.
#
#   build/p259/corpus.sh <scratch-dir> <this-checkout>
#   build/p259/corpus.sh <scratch-dir> clean
#
# Writes nothing outside <scratch-dir>/repos. A failure part way through
# removes what it made; `clean` removes every clone. Every caller calls `clean`
# in its finally block whatever happened.
#
# THE SOURCE IS ONLY EVER A CLONE SOURCE. Nothing is written to it, and a
# target equal to the source is refused, because a clone into its own source is
# a write to the operator's checkout wearing a copy's clothes.
#
# THESE ARE REFUSED BY NAME, as a source and as the scratch directory.
# /Users/gdc/gmux is his live checkout; the other seven are projects of his
# this phase has no business in at all. build/p258/corpus.sh refuses two of
# them under the narrow research lift that is now over; this one refuses the
# whole list, because a measurement that spends his tokens must not be one
# argument away from reading a repository nobody agreed to.
set -uo pipefail
SCRATCH="${1:?usage: corpus.sh <scratch-dir> <this-checkout>|clean}"
CHECKOUT="${2:-}"
FORBIDDEN="/Users/gdc/gmux /Users/gdc/runstory /Users/gdc/specfactory /Users/gdc/stoa /Users/gdc/rookery /Users/gdc/herdr /Users/gdc/orca /Users/gdc/tortiedotsh"
for forbidden in $FORBIDDEN; do
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

DST="$SCRATCH/repos/tortie"
# A target equal to its source is refused before anything is cloned.
if [ "$(cd "$CHECKOUT" 2>/dev/null && pwd -P)" = "$(cd "$(dirname "$DST")" 2>/dev/null && pwd -P)/$(basename "$DST")" ]; then
  echo "[corpus] REFUSED: the target is the source"
  exit 2
fi
if [ -d "$DST/.git" ]; then
  echo "[corpus] have tortie"
else
  # Asked of git rather than of a `.git` directory, because a linked worktree
  # (`git worktree add`) carries a `.git` FILE and is a repository all the same.
  if ! git -C "$CHECKOUT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "[corpus] FAILED: $CHECKOUT is not a repository"
    exit 1
  fi
  echo "[corpus] copying tortie (read-only source $CHECKOUT)"
  git clone --no-hardlinks --local "$CHECKOUT" "$DST" >/dev/null 2>&1 || { echo "[corpus] FAILED tortie"; exit 1; }
fi

KEEP=1
echo "[corpus] done"
du -sh "$SCRATCH/repos"/* 2>/dev/null
