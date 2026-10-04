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
 * PURE. It imports nothing and logs nothing.
 */

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
