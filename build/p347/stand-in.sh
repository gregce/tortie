#!/bin/sh
# build/p347/stand-in.sh: Phase 347's agent stand-in (build/p347/SPEC.md §7).
#
# NOT AN AGENT. It starts no vendor process, spends no token, reads no file of
# the person's and reaches no network. probe:p347 types it into a plain shell
# session on its own scratch tmux server, so every byte a key sends is read
# here, in a pane the probe owns, and written down.
#
#   stand-in.sh prompt <log> [banner]
#       The shape issue 41 is about: the prompt of Claude Code, Codex and pi.
#       Prints <banner> once when one is given, puts the terminal raw
#       (`stty raw -echo`), draws `> ` and the bytes typed so far, and APPENDS
#       every byte it reads to <log> as two lowercase hex digits per line.
#       03, the byte ⌃C sends and the byte the parent's ⌘C sent with nothing
#       selected, CLEARS the draft, exactly as the three agents do. 7f deletes
#       one byte, 0d or 0a submits (a new line, the draft cleared), and 04 ends
#       the stand-in, which is how the probe hands the session back to its
#       shell. The terminal is put back as it was on every way out.
#   stand-in.sh print <file>
#       `cat`s a file of rows the probe composed (issue 40's layouts).
#
# POSIX sh only: one byte at a time through `dd`, its hex through `od`.

set -u

usage() {
  printf '%s\n' 'usage: stand-in.sh prompt <log> [banner] | print <file>' >&2
  exit 2
}

[ "$#" -ge 2 ] || usage
mode=$1
case "$mode" in
  print)
    exec cat -- "$2"
    ;;
  prompt)
    ;;
  *)
    usage
    ;;
esac

log=$2
banner=${3:-}
: >> "$log" || exit 2

[ -n "$banner" ] && printf '%s\n' "$banner"

saved=$(stty -g) || exit 2
restore() {
  stty "$saved" 2>/dev/null
}
trap 'restore' EXIT
trap 'exit 0' HUP TERM
stty raw -echo

# The draft, as hex bytes separated by spaces, and its drawing.
draft=''
draw() {
  printf '\r\033[K> '
  for h in $draft; do
    # shellcheck disable=SC2059
    printf "\\$(printf '%03o' "0x$h")"
  done
}
draw

while :; do
  h=$(dd bs=1 count=1 2>/dev/null | od -An -tx1 | tr -d ' \n')
  [ -n "$h" ] || exit 0
  printf '%s\n' "$h" >> "$log"
  case "$h" in
    03)
      draft=''
      draw
      ;;
    04)
      printf '\r\n'
      exit 0
      ;;
    7f|08)
      set -- $draft
      if [ "$#" -gt 0 ]; then
        kept=''
        n=$#
        i=1
        for b in "$@"; do
          [ "$i" -lt "$n" ] && kept="$kept $b"
          i=$((i + 1))
        done
        draft=${kept# }
      fi
      draw
      ;;
    0d|0a)
      printf '\r\n'
      draft=''
      draw
      ;;
    0[0-9a-f]|1[0-9a-f])
      # Any other control byte is logged and drawn as nothing.
      ;;
    *)
      draft="${draft:+$draft }$h"
      # shellcheck disable=SC2059
      printf "\\$(printf '%03o' "0x$h")"
      ;;
  esac
done
