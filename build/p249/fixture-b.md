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

Restore reads one row, once, and the row it reads is the row the window drew.

Spacing here was uneven.

The restore bar appears when two or more sessions in the project are saved.
