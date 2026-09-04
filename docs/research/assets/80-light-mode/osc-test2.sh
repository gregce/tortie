#!/bin/sh
S=gmux-p213
cleanup() { tmux -L "$S" kill-server 2>/dev/null; rm -f /private/tmp/tmux-501/"$S"; }
trap cleanup EXIT INT TERM
tmux -L "$S" -f /private/tmp/wt-p213/resources/gmux-tmux.conf new-session -d -s osc -x 120 -y 30 'bash -c "stty raw -echo; printf \"\\033]11;?\\033\\\\\"; (sleep 2; printf \"END\") & dd bs=1 count=80 2>/dev/null | od -c; stty sane; echo DONE; sleep 30"'
sleep 5
echo "--- detached, OSC 11 only, pane read back:"; tmux -L "$S" capture-pane -p -t osc | grep -v '^$' | head -6
tmux -L "$S" send-keys -t osc C-c
tmux -L "$S" new-window -t osc 'bash -c "stty raw -echo; printf \"\\033]10;?\\033\\\\\"; (sleep 2; printf \"END\") & dd bs=1 count=80 2>/dev/null | od -c; stty sane; echo DONE; sleep 30"'
sleep 5
echo "--- detached, OSC 10 only, pane read back:"; tmux -L "$S" capture-pane -p -t osc:1 | grep -v '^$' | head -6
