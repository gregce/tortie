# Restore notes

A session that is saved keeps its scrollback snapshot and its resume command,
and one press brings it back. The snapshot is replayed into a fresh pane and the
resume command is typed rather than run, because restoring is always something a
person asks for.

| surface     | holds                 | survives a reboot | rebuilt on open | reader      |
| ----------- | --------------------- | ----------------- | --------------- | ----------- |
| manifest    | argv and resume argv  | yes               | no              | restore     |
| tmux server | the live pane         | no                | yes             | attach host |
| Ledger      | the tab order         | yes               | no              | the window  |

Restore reads one row, once, and the row it reads is the row the window drew. Everything else follows from that sentence: there is a single writer, a single reader, and a stamp saying when. If two answers ever differ, the newer stamp wins outright and the older is discarded rather than merged, so no afternoon can produce a verdict a later afternoon quietly reverses.

Spacing here was uneven.

The restore bar appears when two or more sessions in the project are saved.
A closing note nobody edited.
