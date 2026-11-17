#!/bin/zsh -f
# local-tmux.sh. THIS MAC'S tmux FOR `probe:p360`, which logs every command the
# app sends its scratch server and can hold ONE of them (build/p360/SPEC.md §8).
#
# WHAT IT IS. build/p360/probe-p360.mjs copies this file into its run's scratch
# folder, writes `local-tmux.env` beside the copy, and names the copy with
# GMUX_TMUX_BIN, which a development build accepts for any executable file
# (src/main/tmux/resolve.ts, `planTmuxResolution`). Every tmux command the app
# runs on this Mac (the version probe, the lists, the create, the stamps, the
# control client, the attach clients) then runs THIS, which appends one line to
# the run's log and `exec`s the vendored tmux with the same arguments. It is
# build/p326/far-tmux.sh's shape, for this Mac instead of the far side.
#
# THE ENV FILE, shell-quoted by the probe:
#   REAL   the real tmux binary, which is what runs in the end
#   LOG    the log this appends to
#   RULES  the rules file the probe rewrites atomically between arms
#
# THE LOG, one line per invocation and one per note, never read by the app:
#   <epoch ms> <pid> <argv, each word single-quoted>     an invocation
#   <epoch ms> <pid> # <note>                             a note of this file's
# The time comes from zsh's own `$EPOCHREALTIME` (zsh/datetime) and the line is
# written with the `print` builtin, so logging starts NO child process. A held
# command writes `# held <rule>` when the hold starts and
# `# released <rule> <ms> <release|cap>` when it lets go, so the probe and the
# verifier's re-derivation can place it.
#
# THE RULES, at most one line, one of:
#   hold-new-session-answer   on `new-session … -P`, run the real command, hold
#                             its standard output until `$RULES.release`
#                             appears, then print it and exit with its status
#   hold-stamp OPTION         on `set-option … OPTION` (the probe uses
#                             @gmux-agent), wait for `$RULES.release`, then exec
# EVERY HOLD IS ONE-SHOT AND CAPPED. A hold is taken only by the invocation that
# makes `$RULES.taken` (an atomic mkdir, which the probe removes each time it
# writes the rules), so a second create in the same arm is never held; and no
# hold lasts past HOLD_CAP_MS (4,000 ms), under the exec plane's 10 s deadline
# (src/main/machines/exec-plane.ts), so a probe that stalls cannot turn a hold
# into a timeout the product would answer differently. The waits use
# zsh/zselect when it loads (no child) and `sleep` when not.
#
# It names no socket and no server of its own: the socket, the config and the
# verb are whatever the app sent. It never runs kill-server, never sends a
# command of its own to any server, and never touches HOME or the shell's
# history.

zmodload zsh/datetime 2>/dev/null
zmodload zsh/mapfile 2>/dev/null
zmodload zsh/zselect 2>/dev/null
zmodload -F zsh/files b:zf_mkdir 2>/dev/null

integer HOLD_CAP_MS=4000

here=${0:A:h}
if [[ ! -r $here/local-tmux.env ]]; then
  print -u2 -r -- "local-tmux.sh: no local-tmux.env beside $0"
  exit 127
fi
source $here/local-tmux.env

# The epoch in milliseconds, into REPLY, from the shell's own clock.
_now() {
  local t=$EPOCHREALTIME
  local frac=${t#*.}000
  REPLY=${t%.*}${frac[1,3]}
}

_note() {
  _now
  print -r -- "$REPLY $$ # $*" >> $LOG
}

# One-shot: true for exactly the first invocation after the rules were written.
_take() {
  if (( ${+builtins[zf_mkdir]} )); then
    zf_mkdir $RULES.taken 2>/dev/null
  else
    mkdir $RULES.taken 2>/dev/null
  fi
}

# Wait for the release file, at most HOLD_CAP_MS. Answers in REPLY how it ended.
_hold() {
  local rule=$1
  _now
  local started=$REPLY
  _note held $rule
  local ended=cap
  while true; do
    if [[ -e $RULES.release ]]; then
      ended=release
      break
    fi
    _now
    (( REPLY - started >= HOLD_CAP_MS )) && break
    if (( ${+builtins[zselect]} )); then
      zselect -t 2 2>/dev/null
    else
      sleep 0.02
    fi
  done
  _now
  _note released $rule $(( REPLY - started )) $ended
}

_now
print -r -- "$REPLY $$ ${(qq)@}" >> $LOG

# The leading global options, and the verb after them.
typeset -a all
all=("$@")
integer i=1
while (( i <= $#all )); do
  case ${all[i]} in
    -L|-S|-f|-T|-c) (( i += 2 )) ;;
    --) (( i += 1 )); break ;;
    -*) (( i += 1 )) ;;
    *) break ;;
  esac
done
verb=${all[i]:-}
typeset -a rest
rest=("${(@)all[i+1,-1]}")

typeset -a rules
if [[ -r $RULES ]]; then
  rules=("${(@f)mapfile[$RULES]}")
fi

for line in $rules; do
  typeset -a w
  w=(${=line})
  case ${w[1]:-} in
    hold-new-session-answer)
      if [[ $verb == new-session || $verb == new ]] && (( ${rest[(Ie)-P]} )) && _take; then
        out=$($REAL "$@")
        integer st=$?
        _hold hold-new-session-answer
        print -r -- "$out"
        exit $st
      fi
      ;;
    hold-stamp)
      opt=${w[2]:-}
      if [[ -n $opt && ( $verb == set-option || $verb == set ) ]] && (( ${rest[(Ie)$opt]} )) && _take; then
        _hold hold-stamp-$opt
      fi
      ;;
  esac
done

exec $REAL "$@"
