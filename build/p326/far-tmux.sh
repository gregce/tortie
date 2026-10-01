#!/bin/zsh -f
# far-tmux.sh. THE LOOPBACK MACHINE'S tmux FOR `probe:p326`, which logs every
# command the far side receives and can hold one (build/p326/SPEC.md §8).
#
# WHAT IT IS. build/p326/probe-p326.mjs copies this file into its run's scratch
# folder, writes `far-tmux.env` beside the copy, and names the copy as the
# loopback machine's `remoteTmuxPath` in the scratch profile's machines.json.
# Every tmux command Tortie sends that machine (the lists, the create, the four
# stamps, the attach clients, the control connection) then runs THIS, which
# appends one line to the run's far log and `exec`s the real tmux with the same
# arguments. An environment variable does not cross ssh, which is why the four
# values it needs are in a file beside it rather than in its environment.
#
# THE ENV FILE, shell-quoted by the probe:
#   REAL     the real far tmux binary, which is what runs in the end
#   LOG      the far log this appends to
#   RULES    the rules file the probe rewrites atomically between arms
#   FARHOME  a scratch folder: `.zshrc` (PS1='p326 %# ', HISTFILE unset) and
#            `.hushlogin`
#
# THE LOG, one line per invocation and one per note, never read by the app:
#   <epoch ms> <pid> <argv, each word single-quoted>     an invocation
#   <epoch ms> <pid> # <note>                             a note of this file's
# The time comes from zsh's own `$EPOCHREALTIME` (zsh/datetime) and the line is
# written with the `print` builtin, so logging starts NO child process and adds
# no measurable latency to the race it measures. A note is written when a rule
# holds a command (`# held <rule> <ms>`) and when it lets it go
# (`# released <rule> <ms>`), and when a stranger is planted
# (`# stranger <name> <$-id>`), so the verifier's re-derivation can place a
# held command at the instant it really ran.
#
# THE RULES, one per line, at most these three:
#   stamp-delay-ms N       before any `set-option … @gmux-id …`, wait N ms
#   first-list-delay-ms N  before the FIRST `list-sessions` after the rule was
#                          written, wait N ms; "first" is an atomic mkdir of
#                          `$RULES.first-list`, which the probe removes each
#                          time it writes the rules
#   stranger-on-name NAME  on `new-session … -s NAME`, first create an unstamped
#                          session of that name with the same leading global
#                          options, so the create fails as a duplicate
# The waits use zsh/zselect when it loads (no child) and `sleep` when not.
#
# HIS HOME. Before it execs, it exports HOME and ZDOTDIR as FARHOME and unsets
# HISTFILE, so a far session's shell (the loopback machine IS this Mac, and
# without this its shell is his own login shell reading his own home) writes
# nothing under his home. Phase 320.1's reverify found every real-row run moved
# the modified time of his ~/.zsh_history; this is the line that stops it.
#
# It names no socket and no server of its own: the socket, the config and the
# verb are whatever Tortie sent. It never runs kill-server, never touches -L
# gmux or the default server, and the probe ends the far server by pid.

zmodload zsh/datetime 2>/dev/null
zmodload zsh/mapfile 2>/dev/null
zmodload zsh/zselect 2>/dev/null
zmodload -F zsh/files b:zf_mkdir 2>/dev/null

here=${0:A:h}
if [[ ! -r $here/far-tmux.env ]]; then
  print -u2 -r -- "far-tmux.sh: no far-tmux.env beside $0"
  exit 127
fi
source $here/far-tmux.env

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

_hold() {
  local rule=$1 ms=$2
  [[ $ms == <-> ]] || return 0
  _note held $rule $ms
  if (( ${+builtins[zselect]} )); then
    zselect -t $(( (ms + 9) / 10 )) 2>/dev/null
  else
    sleep $(( ms / 1000.0 ))
  fi
  _note released $rule $ms
}

_now
print -r -- "$REPLY $$ ${(qq)@}" >> $LOG

# The leading global options, and the verb after them.
typeset -a all globals
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
globals=("${(@)all[1,i-1]}")
verb=${all[i]:-}
typeset -a rest
rest=("${(@)all[i+1,-1]}")

export HOME=$FARHOME ZDOTDIR=$FARHOME
unset HISTFILE

typeset -a rules
if [[ -r $RULES ]]; then
  rules=("${(@f)mapfile[$RULES]}")
fi

for line in $rules; do
  typeset -a w
  w=(${=line})
  case ${w[1]:-} in
    stamp-delay-ms)
      if [[ $verb == set-option || $verb == set ]] && (( ${rest[(Ie)@gmux-id]} )); then
        _hold stamp-delay-ms ${w[2]:-}
      fi
      ;;
    first-list-delay-ms)
      if [[ $verb == list-sessions || $verb == ls ]]; then
        if (( ${+builtins[zf_mkdir]} )); then
          zf_mkdir $RULES.first-list 2>/dev/null && _hold first-list-delay-ms ${w[2]:-}
        else
          mkdir $RULES.first-list 2>/dev/null && _hold first-list-delay-ms ${w[2]:-}
        fi
      fi
      ;;
    stranger-on-name)
      name=${w[2]:-}
      if [[ -n $name && ( $verb == new-session || $verb == new ) ]]; then
        integer s=${rest[(ie)-s]}
        if (( s < $#rest )) && [[ ${rest[s+1]} == $name ]]; then
          sid=$($REAL "${(@)globals}" new-session -d -s $name -P -F '#{session_id}' 2>/dev/null)
          _note stranger $name ${sid:-none}
        fi
      fi
      ;;
  esac
done

exec $REAL "$@"
