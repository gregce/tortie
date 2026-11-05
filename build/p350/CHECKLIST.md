# Phase 350: scroll back pi and full-screen agents from the phone, your check

Seven rows, on your own iPhone, this Mac and your Mac Pro, once the Mac release and the phone build that carry Phase 350
are both installed. It takes about fifteen minutes. John's case needs pi 1.0 or later on this Mac: update pi yourself
first if you want it (Tortie installs nothing), or give pi `"tuiMode": "fullscreen"` in its own settings, which shows
the same thing on the pi you have.

| # | Do this | You should see |
| --- | --- | --- |
| 1 | On this Mac, start a new pi session and ask it for something long (say, a hundred numbered lines). On the phone, open that session's Terminal and drag down. | The phone shows the earlier lines, page after page. The Mac's window does not move. |
| 2 | Now scroll that pi session on the Mac with the trackpad, then look at the phone. | The phone's picture stays where it was. This is what Claude Code already did, now for pi too. |
| 3 | On this Mac, start opencode, Qwen or DeepSeek and let it write a long answer. On the phone, open its Terminal, drag down past the top of its rows, and let go. Then drag up past the bottom and let go. | One page back through the agent's answer when you let go, then one page forward. The agent pages on the Mac too, because a full-screen agent has one view. Nothing is asked and no Face ID. |
| 4 | Do row 3 again on your Mac Pro: a full-screen agent there, and a pi there if it is 1.0 or later. | The same pages, one per pull. Tortie does not switch a pi on another machine, so a full-screen pi there pages this way rather than as in row 1. |
| 5 | On a full-screen agent, try a short pull (a few millimetres), a pinch, a long press that selects text and then a drag, and a pull while the agent is asking you to choose something. | None of them pages. Only a pull clearly past the edge does, about the width of a fingertip (44 points). Say if that distance feels wrong on your phone. |
| 6 | Turn the phone sideways, or double tap to zoom, and drag on a full-screen agent. | The rows move first. A page comes only once a pull goes past the top or the bottom of the rows. |
| 7 | Find a pi session from before this release that has ended, so it offers Restore, and restore it. Press Enter on the command Tortie types. | It reads like row 1: its lines scroll back on the phone and the Mac stays put. A pi session still running from before the release keeps its old view until it is next restored. |

If anything in the right-hand column is not what you see, write down which row and which part, and stop there.
