#!/bin/zsh -f
# build/p370/stand-in.zsh, probe:p370's COUNTING GIT (build/p370/SPEC.md §8.1).
#
# The probe copies this file into its run's own `bin/` as `git` and puts that
# folder first on the launched app's PATH and on the PATH its login shell
# answers, so every git the app starts by bare name is this file. It writes one
# line when a call starts and one when it ends, so the children alive at any
# moment are counted from OUTSIDE the app:
#
#   S <time> <pid> <ppid> <subcommand> <cwd>
#   E <time> <pid> <exit> <how> <paths asked>     <how>: pass held fused capped
#
# zsh, and not node or /bin/sh, because A HELD CALL MUST COST NO CHILD AND NO
# CPU (SPEC D15): the hold is zsh's own `zselect`, and it comes BEFORE stdin is
# read, so a held child is an idle zsh (2.5 MB measured, against 4.1 MB when it
# read first). Every line is written before the process exits, so a caller that
# waits for the exit can never start a second call inside the first one's S..E.
#
# Its knobs come from `<run>/control`, read at EVERY call (so one launch steps
# through the cells), one `name=value` a line, written by the probe whole and
# renamed into place:
#
#   LOG=<file>         the log this cell appends to
#   MODE=answer|real   `check-ignore` is answered HERE from the fixture's own
#                      rules (`*.log`, `ignored/`) and real git is never run, or
#                      goes to real git, after the hold either way
#   HOLD_MS=<n>        how long a `check-ignore` is held
#   HOLD_REPO=<dir>    the hold is for this repository alone; every other one is
#                      answered by real git at its own speed (arm A3)
#   FAIL=<code>        `check-ignore` exits with this code and prints nothing (A5)
#   COUNT=1            in `real` mode, count the paths on the way through (A7)
#   HARD=<n>           with that many held calls alive, the next is not held
#
# THE FUSE. Once `<run>/fuse` exists no call is held any longer, and with HARD
# holds alive the next is not held (one empty file a held call under
# `<run>/alive/`, made and removed with builtins). The stand-in can only stop
# HOLDING; the probe is what ends the launch (SPEC §8.1).
#
# Every other subcommand goes to /usr/bin/git unchanged, with this process's
# stdin and stdout, and is logged. The person's own git settings are never read:
# both config variables are set here too, whatever the app passed on.
zmodload zsh/datetime zsh/system zsh/zselect
zmodload -F zsh/files b:zf_rm
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1

REAL=/usr/bin/git
W=${0:A:h:h}
me=$$

typeset -A k
k=(LOG $W/git-log.txt MODE real HOLD_MS 0 HOLD_REPO '' FAIL '' COUNT '' HARD 560)
if [[ -r $W/control ]]; then
  while IFS= read -r line; do
    [[ $line == *=* ]] && k[${line%%=*}]=${line#*=}
  done < $W/control
fi
LOG=$k[LOG]

# The subcommand is the first argument that is not an option.
sub=''
integer i=1
while (( i <= $# )); do
  a=${argv[i]}
  case $a in
    -c|-C|--git-dir|--work-tree|--namespace|--exec-path) (( i += 2 )) ;;
    -*) (( i += 1 )) ;;
    *) sub=$a; break ;;
  esac
done
print -r -- "S $EPOCHREALTIME $me $PPID ${sub:--} ${PWD:A}" >> $LOG

if [[ $sub != check-ignore ]]; then
  $REAL "$@"
  integer code=$?
  print -r -- "E $EPOCHREALTIME $me $code pass 0" >> $LOG
  exit $code
fi

mode=$k[MODE]
integer hold=$k[HOLD_MS]
if [[ -n $k[HOLD_REPO] && ${PWD:A} != $k[HOLD_REPO] ]]; then
  hold=0
  mode=real
fi

# The hold, unless the fuse has blown or too many are already held.
how=pass
if (( hold > 0 )); then
  how=held
  if [[ -e $W/fuse ]]; then
    how=fused
  else
    alive=($W/alive/*(N))
    if (( $#alive >= k[HARD] )); then
      how=capped
    else
      : > $W/alive/$me
      zselect -t $(( hold / 10 ))
      zf_rm -f $W/alive/$me 2>/dev/null
    fi
  fi
fi

integer asked=0
integer code=1
if [[ -n $k[FAIL] || $mode == answer || $k[COUNT] == 1 ]]; then
  data=''
  while sysread -i 0 chunk 2>/dev/null; do data+=$chunk; done
  paths=(${(0)data})
  asked=$#paths
fi
if [[ -n $k[FAIL] ]]; then
  code=$k[FAIL]
elif [[ $mode == answer ]]; then
  hits=(${(M)paths:#(*.log|ignored|ignored/|ignored/*)})
  if (( $#hits > 0 )); then
    print -rN -- $hits
    code=0
  fi
elif [[ $k[COUNT] == 1 ]]; then
  print -rn -- "$data" | $REAL "$@"
  code=$pipestatus[2]
else
  $REAL "$@"
  code=$?
fi
print -r -- "E $EPOCHREALTIME $me $code $how $asked" >> $LOG
exit $code
