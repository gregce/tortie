#!/bin/bash
# Phase 256 prototype — the corpus.
#
# RESEARCH PROTOTYPE. Shallow, READ-ONLY clones into a scratch directory the
# script removes in a trap, plus scratch copies of two of the operator's own
# repositories which are never touched in place.
#
#   build/p256/det/corpus.sh <scratch-dir>
#
# Writes nothing outside <scratch-dir>. Every clone is --depth 1 --no-tags with
# no submodules, and nothing in any clone is ever executed.
#
# `corpus.sh <scratch-dir> clean` removes every clone. The researcher's own run
# removed them at the end of the phase; nothing here is meant to survive it.
set -uo pipefail
SCRATCH="${1:?usage: corpus.sh <scratch-dir> [clean]}"
KEEP=0
cleanup() {
  if [ "$KEEP" = "0" ]; then
    echo "[corpus] removing $SCRATCH/repos"
    rm -rf "$SCRATCH/repos"
  fi
}
if [ "${2:-}" = "clean" ]; then
  trap cleanup EXIT
  exit 0
fi
# A successful build KEEPS the clones so the measurement scripts can run over
# them; only a failure part-way through removes what it made.
trap cleanup EXIT
mkdir -p "$SCRATCH/repos"

clone() {
  local name="$1" url="$2" ref="${3:-}"
  local dst="$SCRATCH/repos/$name"
  if [ -d "$dst/.git" ]; then echo "[corpus] have $name"; return 0; fi
  echo "[corpus] cloning $name"
  if [ -n "$ref" ]; then
    git clone --depth 1 --no-tags --recurse-submodules=no --branch "$ref" "$url" "$dst" >/dev/null 2>&1 \
      || { echo "[corpus] FAILED $name"; return 1; }
  else
    git clone --depth 1 --no-tags --recurse-submodules=no "$url" "$dst" >/dev/null 2>&1 \
      || { echo "[corpus] FAILED $name"; return 1; }
  fi
}

copy_local() {
  local name="$1" src="$2"
  local dst="$SCRATCH/repos/$name"
  if [ -d "$dst/.git" ]; then echo "[corpus] have $name"; return 0; fi
  echo "[corpus] copying $name (read-only source)"
  git clone --no-hardlinks --local "$src" "$dst" >/dev/null 2>&1 || { echo "[corpus] FAILED $name"; return 1; }
}

clone ripgrep      https://github.com/BurntSushi/ripgrep.git
clone gotify       https://github.com/gotify/server.git
clone fastapi-app  https://github.com/fastapi/full-stack-fastapi-template.git
clone mastodon     https://github.com/mastodon/mastodon.git
clone requests     https://github.com/psf/requests.git
clone babel        https://github.com/babel/babel.git
clone alamofire    https://github.com/Alamofire/Alamofire.git

KEEP=1
echo "[corpus] done"
du -sh "$SCRATCH/repos"/* 2>/dev/null
