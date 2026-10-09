#!/bin/sh
# tmux-wrapper.sh. A tmux that refuses what the table says it takes, or says a
# version it is not (Phase 342, build/p342/SPEC.md §7.7 K1 and K2).
#
# It runs INSIDE a throwaway container, installed by build/p342/probe-p342.mjs
# through build/docker-run.mjs as the distribution's own /usr/bin/tmux, the
# real binary moved beside it to /usr/bin/tmux.p342-real. Never on this Mac.
# Every argv it is handed is appended to /tmp/p342-tmux-argv.log first, so the
# probe reads what Tortie sent rather than what Tortie said it sent. Then:
#
#   /etc/p342-tmux/refuse         holds ONE option name: a `set-option` of that
#                                 option (alone or after `;`) is refused in
#                                 tmux's own words, `invalid option: <name>`,
#                                 exit 1, and nothing else in that call runs.
#   /etc/p342-tmux/refuse-value   holds ONE value: a `set-option` handed exactly
#                                 that value is refused as `invalid style:
#                                 <value>`, exit 1 (a refused fallback).
#   /etc/p342-tmux/say-version    holds a version: `-V` answers `tmux <it>`
#                                 instead of the real program's own line, and the
#                                 server it starts still runs as itself (K2's
#                                 version that lies).
#
# Everything else is handed to the real binary with `exec`, unchanged: the
# server, the control child and an attach are the real tmux's processes.
REAL=/usr/bin/tmux.p342-real
CONF=/etc/p342-tmux
LOG=/tmp/p342-tmux-argv.log
{
  printf '%s' "$$"
  for a in "$@"; do printf ' [%s]' "$a"; done
  printf '\n'
} >>"$LOG" 2>/dev/null
for a in "$@"; do
  if [ "$a" = -V ] && [ -f "$CONF/say-version" ]; then
    printf 'tmux %s\n' "$(cat "$CONF/say-version")"
    exit 0
  fi
done
refuse=
value=
[ -f "$CONF/refuse" ] && refuse=$(cat "$CONF/refuse")
[ -f "$CONF/refuse-value" ] && value=$(cat "$CONF/refuse-value")
if [ -n "$refuse" ] || [ -n "$value" ]; then
  # Walk the argv: skip tmux's own options, then read each command of a `;`
  # chain. In a `set-option` the first word that is not a flag (or a flag's
  # argument) is the option's name, and the one after it its value.
  verb=
  name=
  val=
  want=verb
  skip=0
  for a in "$@"; do
    if [ "$skip" = 1 ]; then skip=0; continue; fi
    if [ "$a" = ';' ]; then verb=; name=; val=; want=verb; continue; fi
    case "$want" in
      verb)
        case "$a" in
          -L|-S|-f|-c|-T) skip=1 ;;
          -*) ;;
          *) verb=$a; want=name ;;
        esac
        ;;
      name)
        if [ "$verb" != set-option ] && [ "$verb" != set ]; then continue; fi
        case "$a" in
          -t) skip=1 ;;
          -*) ;;
          *) name=$a; want=value ;;
        esac
        if [ -n "$name" ] && [ "$name" = "$refuse" ]; then
          printf 'invalid option: %s\n' "$name" >&2
          exit 1
        fi
        ;;
      value)
        val=$a
        want=done
        if [ -n "$value" ] && [ "$val" = "$value" ]; then
          printf 'invalid style: %s\n' "$val" >&2
          exit 1
        fi
        ;;
    esac
  done
fi
exec "$REAL" "$@"
