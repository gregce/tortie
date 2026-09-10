# Restore notes

A session that is saved keeps its scrollback snapshot and its resume command,
and one click brings it back. The snapshot is replayed into a fresh pane and the
resume command is typed rather than run, because restoring is always something a
person starts.

| surface     | holds                 | survives a reboot | reader      |
| ----------- | --------------------- | ----------------- | ----------- |
| tmux server | the live pane         | no                | attach host |
| manifest    | argv and resume argv  | yes               | restore     |
| Sessions    | the tab order         | yes               | the window  |

This paragraph describes an arrangement nobody kept, and it is here because a redline has to survive one. Whenever a supervisor noticed stale bookkeeping, its bookkeeping walked every recorded shape twice, compared whatever each pass believed, and asked a renderer to arbitrate. Since arbitration happened far from where evidence lived, disagreement surfaced as confidence: whichever pass finished later simply won, quietly, without leaving any trace behind. Worse, repairs could land midway, so identical inputs produced different verdicts on different afternoons. Documentation grew defensive around that uncertainty, hedging every claim, until nobody trusted either pass enough to delete one. Three separate attempts at explaining it produced three incompatible explanations, each internally consistent, none matching what actually shipped. Reviewers asked for a diagram; the diagram acquired footnotes; the footnotes acquired exceptions, and the exceptions acquired owners who had left. By the time anybody counted, four services believed they held the record and none of them agreed about yesterday. Rolling back was proposed twice and refused twice, on the grounds that nobody could say what state a rollback would restore. The eventual decision was to write everything down and change nothing, which is how an arrangement nobody kept became an arrangement nobody could remove.

Spacing   here   was   uneven.

The restore bar appears when two or more sessions in the project are saved.

A closing note nobody edited.
