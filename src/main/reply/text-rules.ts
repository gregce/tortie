/**
 * THE MESSAGE'S OWN RULES (Phase 318, build/p318/SPEC.md §5.5, D15; research
 * 135 §3.3, §3.7, §7 ruling 4; his ruling 3).
 *
 * A message is EXACTLY HIS BYTES. Nothing here strips, trims, replaces or
 * normalizes anything, ever: a text that breaks a rule is refused whole with
 * the rule's own word, and a text that keeps them is sent as it came.
 *
 *   empty      no characters
 *   character  ESC or any other C0 control but LF (TAB and CR included), DEL,
 *              a C1 control, or half of a surrogate pair. ESC is refused at
 *              main whatever the tmux build: 3.6a passes a pasted ESC raw, so
 *              `ESC[201~` would end the paste early and the Return after it
 *              would submit (research 135 §3.3)
 *   long       more than 4,096 bytes of UTF-8, a product choice and not a tmux
 *              limit
 *
 * `/` and `!` pass (his ruling 3): slash commands and shell escapes reach the
 * agent as typed. U+2028, skin tones, a ZWJ family, a flag and a decomposed
 * `é` pass too; research 135 §3.7 measured each delivered exact.
 *
 * THE PASTE'S RULES (Phase 348, build/p348/SPEC.md D51), {@link pasteRefusal},
 * are these with ONE character let in beside the line feed, the TAB, and the
 * paste's own bound, `POCKET_PASTE_MAX_TEXT_BYTES` (16,384), from the
 * contract. MEASURED by the spec step (§2.2) through the shipping exec plane
 * on tmux 3.7b and 3.6a: a TAB, a line feed (as a carriage return), BEL, BS, a
 * C1 control and every valid UTF-8 character reach the program the same on
 * both; CR LF lands as TWO carriage returns; and 3.6a passes ESC, DEL and NUL
 * raw where 3.7b sends `^[`, `^?` and `^@`, so a pasted `ESC[201~` would end
 * the bracket early on 3.6a and the line after it would run at a shell. Every
 * byte the two builds send differently is therefore refused, so a program
 * reads the same paste on both. `textRefusal` does not move.
 *
 * PURE. It imports one constant from the contract and logs nothing.
 */

import { POCKET_PASTE_MAX_TEXT_BYTES } from '@shared/ipc/pocket';

/** The longest message, in bytes of UTF-8. Declared here and nowhere else. */
export const REPLY_TEXT_MAX_BYTES = 4_096;

/** Why a message is refused, or null when it may be sent. Rules in order, by code unit. */
export function textRefusal(text: string): null | 'empty' | 'long' | 'character' {
  if (text.length === 0) return 'empty';
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const after = i + 1 < text.length ? text.charCodeAt(i + 1) : -1;
      if (after < 0xdc00 || after > 0xdfff) return 'character';
      // The pair is whole: its low half is read here and not again.
      i += 1;
      continue;
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) return 'character';
    if (unit <= 0x1f && unit !== 0x0a) return 'character';
    if (unit >= 0x7f && unit <= 0x9f) return 'character';
  }
  if (Buffer.byteLength(text, 'utf8') > REPLY_TEXT_MAX_BYTES) return 'long';
  return null;
}

/**
 * Why a paste is refused, or null when it may be pasted (Phase 348, D51).
 * 318's loop over code units, with the TAB let in beside the line feed, and
 * the paste's own bound: `empty` for no characters; `character` for ESC, CR
 * or any other C0 control but LF and TAB, DEL, a C1 control, or half of a
 * surrogate pair; `long` above {@link POCKET_PASTE_MAX_TEXT_BYTES} bytes of
 * UTF-8. Nothing is stripped, trimmed or normalized: a text that keeps the
 * rules is pasted as it came.
 */
export function pasteRefusal(text: string): null | 'empty' | 'long' | 'character' {
  if (text.length === 0) return 'empty';
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const after = i + 1 < text.length ? text.charCodeAt(i + 1) : -1;
      if (after < 0xdc00 || after > 0xdfff) return 'character';
      // The pair is whole: its low half is read here and not again.
      i += 1;
      continue;
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) return 'character';
    if (unit <= 0x1f && unit !== 0x0a && unit !== 0x09) return 'character';
    if (unit >= 0x7f && unit <= 0x9f) return 'character';
  }
  if (Buffer.byteLength(text, 'utf8') > POCKET_PASTE_MAX_TEXT_BYTES) return 'long';
  return null;
}
