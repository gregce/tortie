#!/bin/sh
# gnu-stat-standin.sh. GNU coreutils' `stat`, as far as Tortie's far scripts
# ask it, on this Mac (Phase 342, build/p342/SPEC.md §6.1 condition 149).
#
# WHY IT EXISTS. Every save of an existing file and every New Folder on a GNU
# or uutils Linux machine failed until Phase 342, because the far script read a
# file's mode with BSD `stat -f %Lp` FIRST and kept what it printed: on GNU,
# `-f` is "file system status", which prints five lines per file to stdout and
# exits 1, so the save's `chmod` was handed five lines (§14 M11). No Linux
# machine was contacted before this phase. Condition 149 of
# `conformance:machines` hands the SHIPPING far texts to /bin/sh and /bin/dash
# with THIS file first on PATH, so the gate meets the GNU answer shapes on
# every build without a Linux machine, and a far text that keeps the stdout of
# a BSD `stat -f` it ran before the GNU spelling reads wrong here.
#
# WHAT IT ANSWERS, and nothing else:
#   stat [-L] -c FORMAT FILE...   GNU's format directives %a %d %i %n %s %Y %h
#                                 %u %g, translated to this Mac's own
#                                 /usr/bin/stat -f (%Lp %d %i %N %z %m %l %u
#                                 %g), so every number is the real one. Literal
#                                 text in FORMAT is printed as it stands. One
#                                 line per FILE; a missing FILE is an error on
#                                 stderr and exit 1, as GNU does.
#   stat [-L] -f ANYTHING...      GNU's --file-system: EVERY operand is a FILE,
#                                 a BSD format string included. For each one
#                                 that exists, GNU's five-line file-system block
#                                 on STDOUT; for each that does not, an error on
#                                 stderr; exit 1 when any failed. This is the
#                                 shape that broke saving on Linux.
#   stat --version                one line naming GNU coreutils.
# Anything else: "stat: invalid option" on stderr, exit 1.
#
# It runs only this Mac's /usr/bin/stat, by its absolute path, and writes
# nothing. Its self-test is condition 149's: `-c '%a'` equals BSD `%Lp`,
# `-c '%d:%i'` equals BSD's pair, and `-f %Lp FILE` prints five lines and exits
# 1. An ablation that makes `-f` print nothing must turn that self-test red,
# because a stand-in that answers GNU's -f quietly would pass the shipping
# texts AND the BSD-first texts alike.
REAL=/usr/bin/stat
deref=
if [ "$1" = --version ]; then
  printf 'stat (GNU coreutils) 9.4 (Tortie stand-in, build/p342/gnu-stat-standin.sh)\n'
  exit 0
fi
if [ "$1" = -L ]; then
  deref=-L
  shift
fi
case "$1" in
  -c|--format)
    fmt=$2
    shift 2
    # GNU directive to BSD directive, one at a time, so a literal % survives.
    bsd=$(printf '%s' "$fmt" | sed -e 's/%%/\x01/g' -e 's/%a/%Lp/g' -e 's/%n/%N/g' -e 's/%s/%z/g' \
      -e 's/%Y/%m/g' -e 's/%h/%l/g' -e 's/\x01/%%/g')
    rc=0
    for f in "$@"; do
      if [ -n "$deref" ]; then
        "$REAL" -L -f "$bsd" "$f" 2>/dev/null || { printf "stat: cannot statx '%s': No such file or directory\n" "$f" >&2; rc=1; }
      else
        "$REAL" -f "$bsd" "$f" 2>/dev/null || { printf "stat: cannot statx '%s': No such file or directory\n" "$f" >&2; rc=1; }
      fi
    done
    exit $rc
    ;;
  -f|--file-system)
    shift
    rc=0
    for f in "$@"; do
      if [ -e "$f" ]; then
        printf '  File: "%s"\n' "$f"
        printf '    ID: 1a2b3c4d5e6f7081 Namelen: 255     Type: overlayfs\n'
        printf 'Block size: 4096       Fundamental block size: 4096\n'
        printf 'Blocks: Total: 15350451   Free: 11290939   Available: 10504099\n'
        printf 'Inodes: Total: 3907584    Free: 3609418\n'
      else
        printf "stat: cannot read file system information for '%s': No such file or directory\n" "$f" >&2
        rc=1
      fi
    done
    exit $rc
    ;;
esac
printf "stat: invalid option -- '%s'\n" "$1" >&2
exit 1
