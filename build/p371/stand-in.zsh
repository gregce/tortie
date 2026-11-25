#!/bin/zsh -f
# build/p371/stand-in.zsh, probe:p371's COUNTING GIT (build/p371/SPEC.md §8.1).
#
# The probe copies this file into its run's own `bin/` as `git` and puts that
# folder first on the launched app's PATH and on the PATH its login shell
# answers, so every git the app starts by bare name is this file. It writes one
# line when a call starts and one when it ends, so what the app asked git is
# read from OUTSIDE the app:
#
#   S <time> <pid> <ppid> <subcommand> <its next two arguments> <cwd>
#   E <time> <pid> <exit> <how>                   <how>: pass held fused failed
#
# The next two arguments tell History's reads apart: `rev-parse --verify` is the
# walk's and `--abbrev-ref` the remotes', `log -z,--topo-order` is History's walk
# and `log -z,--decorate=full` a file's. A call main itself ends writes no E.
#
# zsh, and not node or /bin/sh, because A HELD CALL MUST COST NO CHILD AND NO
# CPU: the hold is zsh's own `zselect`, polled twice a second for the fuse, and
# it comes BEFORE real git runs. The E line is written before the process exits.
#
# Its knobs come from `<run>/control`, read at EVERY call, one `name=value` a
# line, written whole by the probe and renamed into place:
#
#   LOG=<file>        the log this cell appends to
#   HOLD_MS=<n>       how long a call is held (never `check-ignore`)
#   HOLD_ONLY=a,b     only these subcommands are held
#   FAIL=a,b          these subcommands print nothing and exit 1, after any hold
#   GLOBAL=<file>     the global git file (the arms that need one; else /dev/null)
#   GITDIR=<dir>      real git reads this git directory instead of the project's
#   WORKTREE=<dir>    with it, that working tree (arm A8: a hostile config that
#                     would hang real git is read by main and never by git)
#
# THE FUSE. Once `<run>/fuse` exists no call is held any longer. The stand-in can
# only stop HOLDING; the probe is what ends the launch. His own git settings are
# never read: both variables are set here whatever the app passed on.
zmodload zsh/datetime zsh/zselect
REAL=/usr/bin/git
W=${0:A:h:h}
typeset -A k
k=(LOG $W/git-log.txt HOLD_MS 0 HOLD_ONLY '' FAIL '' GLOBAL /dev/null GITDIR '' WORKTREE '')
if [[ -r $W/control ]]; then
  while IFS= read -r line; do
    [[ $line == *=* ]] && k[${line%%=*}]=${line#*=}
  done < $W/control
fi
export GIT_CONFIG_GLOBAL=$k[GLOBAL] GIT_CONFIG_NOSYSTEM=1

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
rest="${(j:,:)argv[i+1,i+2]}"
rest=${${rest//[[:space:]]/_}:--}
[[ $sub == log && -n ${(M)argv:#--follow} ]] && rest+=,--follow
print -r -- "S $EPOCHREALTIME $$ $PPID ${sub:--} $rest ${PWD:A}" >> $k[LOG]

how=pass
integer left=$(( k[HOLD_MS] / 10 ))
if [[ $sub != check-ignore ]] && (( left > 0 )) && [[ -z $k[HOLD_ONLY] || ,$k[HOLD_ONLY], == *,$sub,* ]]; then
  how=held
  while (( left > 0 )); do
    if [[ -e $W/fuse ]]; then how=fused; break; fi
    zselect -t $(( left > 50 ? 50 : left ))
    (( left -= 50 ))
  done
fi
integer code=1
if [[ -n $k[FAIL] && ,$k[FAIL], == *,$sub,* ]]; then
  how=failed
else
  if [[ -n $k[GITDIR] ]]; then export GIT_DIR=$k[GITDIR] GIT_WORK_TREE=$k[WORKTREE]; fi
  $REAL "$@"
  code=$?
fi
print -r -- "E $EPOCHREALTIME $$ $code $how" >> $k[LOG]
exit $code
