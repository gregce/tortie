#!/bin/sh
# key-recorder.sh MODE OUT. The program in a pane that records which bytes a
# key reaches it as (Phase 342, build/p342/SPEC.md D22, §7.4, §7.5 L12).
#
# It runs INSIDE a throwaway container's tmux pane, put there by
# build/p342/measure-p342.mjs or build/p342/probe-p342.mjs through
# build/docker-run.mjs, never on this Mac. It prints the terminal mode MODE asks
# for (the seven modes build/fixtures/screen/keys-encoding.json measured on 3.6a
# and 3.7b), puts its terminal in raw mode with no echo, and copies every byte it
# reads to OUT one byte at a time, so the bytes tmux delivered for each key are
# what OUT holds. The harness separates keys with a literal 0x7c (`send-keys -H
# 7c`), which no key below produces.
#
#   normal          nothing
#   decckm          ESC [ ? 1 h        cursor keys in application mode
#   decckm,keypad   ESC [ ? 1 h ESC =  and the keypad too
#   mok1            ESC [ > 4 ; 1 m    modifyOtherKeys level 1
#   mok2            ESC [ > 4 ; 2 m    modifyOtherKeys level 2
#   kitty           ESC [ > 1 u        the kitty keyboard protocol, first flag
#   paste           ESC [ ? 2004 h     bracketed paste
#
# It reads nothing else, writes nothing but OUT, and ends when its pane does.
mode=$1
out=$2
if [ -z "$mode" ] || [ -z "$out" ]; then
  printf 'usage: key-recorder.sh MODE OUT\n' >&2
  exit 2
fi
case "$mode" in
  normal) seq='' ;;
  decckm) seq='\033[?1h' ;;
  decckm,keypad) seq='\033[?1h\033=' ;;
  mok1) seq='\033[>4;1m' ;;
  mok2) seq='\033[>4;2m' ;;
  kitty) seq='\033[>1u' ;;
  paste) seq='\033[?2004h' ;;
  *) printf 'key-recorder.sh: no mode %s\n' "$mode" >&2; exit 2 ;;
esac
: > "$out"
# shellcheck disable=SC2059
printf "$seq"
stty raw -echo
exec dd bs=1 of="$out" 2>/dev/null
