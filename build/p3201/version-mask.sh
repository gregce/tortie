#!/bin/sh
# version-mask.sh. probe:p320's arm A2 (Phase 320.1, build/p3201/SPEC.md §7.1):
# a machine whose tmux reports a version Tortie has NOT measured a live
# connection on, and that is in every other way the loopback machine's tmux.
#
# The probe copies this file into its run directory as `tmux`, beside a
# `version-mask.conf` it writes, and gives THAT path as the machine's
# `remoteTmuxPath`. The conf sets two names and nothing else:
#
#   P3201_MASK_REAL      the absolute path of the real tmux
#   P3201_MASK_VERSION   the version to report, e.g. 3.5a
#
# It answers the two questions Tortie asks a machine's tmux about its version,
# `-V` alone and `display-message -p '#{version}'`, with the masked version,
# and runs the real tmux, unchanged, for everything else. So the machine is
# prepared and confirmed exactly as a person would accept that version on the
# confirm sheet, the control connection is refused by
# `decideRemoteControlGate`, and the machine keeps NO_PANE_HERE: Phase 320's
# pass-through, byte for byte as at the parent.
#
# It starts nothing of its own, writes nothing, and ends when the tmux it
# execs ends. It never names a socket: the caller's `-L` is passed through.
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 70
conf="$here/version-mask.conf"
[ -r "$conf" ] || { echo "version-mask: no $conf" >&2; exit 70; }
. "$conf"
case "$P3201_MASK_REAL" in
  /*) ;;
  *) echo "version-mask: P3201_MASK_REAL is not an absolute path" >&2; exit 70 ;;
esac
if [ "$#" -eq 1 ] && [ "$1" = "-V" ]; then
  echo "tmux $P3201_MASK_VERSION"
  exit 0
fi
prev=""
last=""
verb=0
for a in "$@"; do
  [ "$a" = "display-message" ] && verb=1
  prev=$last
  last=$a
done
if [ "$verb" -eq 1 ] && [ "$prev" = "-p" ] && [ "$last" = '#{version}' ]; then
  echo "$P3201_MASK_VERSION"
  exit 0
fi
exec "$P3201_MASK_REAL" "$@"
