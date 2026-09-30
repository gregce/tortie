#!/bin/sh
# build/p323/stand-in.sh — probe:p323's PLANTED processes (build/p323/SPEC.md §8.1).
#
# NOT droid and not an agent. probe:p323 puts a `droid` wrapper on its scratch
# PATH that execs this file, because the droid registry row is installed on no
# machine this probe runs on, so its bare name is free for a stand-in. Tortie
# creates the session exactly as it creates any droid session and appends the
# create's extra argument, which is the MODE below. Every table the probe writes
# labels a row made from this file as planted.
#
# Each mode is one shape the phase must get right, and each one's expected
# fate at HEAD is written beside it. None of them reads, writes or sends
# anything outside $P323_STANDIN_DIR, and each sleeps for a distinct number of
# seconds so its command line names it. The probe ends every process a mode
# starts, by pid, in its own `finally`, whatever the product did.
#
#   ignore-hup           the pane's own process ignores the hang-up:      SIGTERM
#   fg-child-ignore-hup  the pane's process ends on the hang-up, and its
#                        foreground child in the pane's group ignores it: SIGTERM
#   ignore-hup-and-term  ignores the hang-up AND SIGTERM:                 SIGKILL
#   setsid-child         a child that called setsid (its own group):      never signalled
#   shared-server        starts a setsid server on a unix socket under the
#                        stand-in folder, then waits in the pane:         the server never signalled
#   shared-client        connects to that server and holds the connection,
#                        writing the time of every byte it receives
#   app-bundle           /bin/sleep reached through Fake.app/Contents/MacOS/
#                        (a link: a copy of an Apple platform binary is
#                        killed by the kernel the moment it starts), in the
#                        pane's group, ignoring the hang-up:              never signalled
#   plain                a process that ends on the hang-up, as every agent
#                        the census measured except Gemini does. Arm (C)'s
#                        End round trip is timed on these, in ABBA order
#                        across the builds (the tools round):             never signalled
#
# `--version` and `--help` answer at once and start nothing, because Tortie's
# agent scan asks every registry binary for its version.

mode="${1:-}"

case "$mode" in
  --version | -v | version)
    echo "p323-stand-in 0.0.0 (planted, not droid)"
    exit 0
    ;;
  --help | -h | help | '')
    echo "p323-stand-in: a planted process for probe:p323; see the file's header"
    exit 0
    ;;
esac

dir="${P323_STANDIN_DIR:-}"
if [ -z "$dir" ] || [ ! -d "$dir" ]; then
  echo "p323-stand-in: P323_STANDIN_DIR is not a folder, so nothing starts" >&2
  exit 2
fi

# One line the probe reads to know the pane is this file and not anything else.
hello() {
  printf '{"pid":%s,"mode":"%s"}\n' "$$" "$mode" > "$dir/hello-$$.json"
  printf 'P323 STAND-IN %s ready (pid %s)\n' "$mode" "$$"
}

case "$mode" in
  ignore-hup)
    hello
    trap '' HUP
    exec /bin/sleep 3601
    ;;

  fg-child-ignore-hup)
    hello
    # A plain sh has no job control, so the child stays in the pane's group
    # and in the terminal's foreground group. This shell keeps the default
    # hang-up action and ends on it; the child does not.
    /bin/sh -c "trap '' HUP; exec /bin/sleep 3602"
    exit 0
    ;;

  ignore-hup-and-term)
    hello
    trap '' HUP TERM
    exec /bin/sleep 3603
    ;;

  setsid-child)
    hello
    /usr/bin/perl -MPOSIX=setsid -e 'setsid() or die "setsid"; exec "/bin/sleep", "3604"' < /dev/null > /dev/null 2>&1 &
    exec /bin/sleep 3605
    ;;

  shared-server)
    hello
    sock="$dir/shared.sock"
    state="$dir/shared-server.state"
    rm -f "$sock" "$state"
    # Its own session and group, as Codex's shared background server is
    # (build/p323/SPEC.md §2.1): a single fork that calls setsid. It answers
    # every connection with a byte every half second and writes how many
    # connections it holds.
    /usr/bin/perl -MPOSIX=setsid -MIO::Socket::UNIX -MIO::Select -e '
      setsid() or die "setsid";
      $SIG{PIPE} = "IGNORE";
      my ($path, $state) = @ARGV;
      my $srv = IO::Socket::UNIX->new(Type => SOCK_STREAM(), Local => $path, Listen => 8) or die "listen: $!";
      my $sel = IO::Select->new($srv);
      my @clients;
      while (1) {
        for my $fh ($sel->can_read(0.5)) {
          if ($fh == $srv) {
            my $c = $srv->accept;
            if ($c) { $sel->add($c); push @clients, $c; }
          } else {
            my $n = sysread($fh, my $buf, 64);
            if (!$n) { $sel->remove($fh); @clients = grep { $_ != $fh } @clients; close $fh; }
          }
        }
        for my $c (@clients) { syswrite($c, "t\n"); }
        if (open(my $o, ">", "$state.tmp")) { print $o scalar(@clients), "\n"; close $o; rename("$state.tmp", $state); }
      }' "$sock" "$state" < /dev/null > /dev/null 2>&1 &
    exec /bin/sleep 3606
    ;;

  shared-client)
    hello
    exec /usr/bin/perl -MIO::Socket::UNIX -e '
      $SIG{PIPE} = "IGNORE";
      my ($path, $state) = @ARGV;
      my $c;
      for (1 .. 200) {
        $c = IO::Socket::UNIX->new(Type => SOCK_STREAM(), Peer => $path) and last;
        select(undef, undef, undef, 0.1);
      }
      die "p323-stand-in: no shared server\n" unless $c;
      while (1) {
        my $n = sysread($c, my $buf, 64);
        last if !$n;
        if (open(my $o, ">", "$state.tmp")) { print $o time(), "\n"; close $o; rename("$state.tmp", $state); }
      }
      if (open(my $o, ">", "$state.tmp")) { print $o "closed\n"; close $o; rename("$state.tmp", $state); }
      sleep 3607;' "$dir/shared.sock" "$dir/shared-client.state"
    ;;

  plain)
    hello
    exec /bin/sleep 3609
    ;;

  app-bundle)
    hello
    fake="${P323_FAKE_APP:-}"
    case "$fake" in
      '') echo "p323-stand-in: P323_FAKE_APP is not set" >&2; exit 2 ;;
      *.app/Contents/MacOS/*) ;;
      *) echo "p323-stand-in: P323_FAKE_APP is not inside an application bundle" >&2; exit 2 ;;
    esac
    trap '' HUP
    exec "$fake" 3608
    ;;

  *)
    echo "p323-stand-in: unknown mode $mode" >&2
    exit 2
    ;;
esac
