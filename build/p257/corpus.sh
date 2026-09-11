#!/bin/bash
# Phase 257 — the corpus for `npm run probe:p257`.
#
# build/p256/det/corpus.sh's seven public repositories, being shallow READ-ONLY
# clones into a scratch directory, plus two local copies made with
# `git clone --local`: this checkout as `tortie` and /Users/gdc/stoa as `stoa`.
# Both local sources are only ever a clone SOURCE; nothing is written to them.
#
#   build/p257/corpus.sh <scratch-dir> [<this-checkout>]
#   build/p257/corpus.sh <scratch-dir> clean
#
# Writes nothing outside <scratch-dir>. Every public clone is --depth 1
# --no-tags with no submodules, and nothing in any clone is ever executed.
# A failure part way through removes what it made; `clean` removes every clone.
#
# TWO DIRECTORIES ARE REFUSED BY NAME. /Users/gdc/runstory and
# /Users/gdc/specfactory were read once, one HTML file each, under the narrow
# lift research 118 §1 records, and that lift is over. Passing either as a
# source, or as the scratch directory, exits 2 before anything is cloned.
set -uo pipefail
SCRATCH="${1:?usage: corpus.sh <scratch-dir> [<this-checkout>|clean]}"
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
trap cleanup EXIT
mkdir -p "$SCRATCH/repos"

clone() {
  local name="$1" url="$2"
  local dst="$SCRATCH/repos/$name"
  if [ -d "$dst/.git" ]; then echo "[corpus] have $name"; return 0; fi
  echo "[corpus] cloning $name"
  git clone --depth 1 --no-tags --recurse-submodules=no "$url" "$dst" >/dev/null 2>&1 \
    || { echo "[corpus] FAILED $name"; return 1; }
}

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

clone ripgrep      https://github.com/BurntSushi/ripgrep.git
clone gotify       https://github.com/gotify/server.git
clone fastapi-app  https://github.com/fastapi/full-stack-fastapi-template.git
clone mastodon     https://github.com/mastodon/mastodon.git
clone requests     https://github.com/psf/requests.git
clone babel        https://github.com/babel/babel.git
clone alamofire    https://github.com/Alamofire/Alamofire.git
if [ -n "$CHECKOUT" ]; then copy_local tortie "$CHECKOUT"; fi
copy_local stoa /Users/gdc/stoa

KEEP=1
echo "[corpus] done"
du -sh "$SCRATCH/repos"/* 2>/dev/null
