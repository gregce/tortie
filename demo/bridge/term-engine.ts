/**
 * The demo's terminal: a tiny in-browser stand-in for the tmux byte stream.
 *
 * Two modes per session, both feeding the same subscriber list that the
 * bridge's `term.onData(sessionId, cb)` taps:
 *
 *  - `script`: an auto-playing transcript (an agent at work). Chunks are
 *    revealed on timers, looping is the caller's choice.
 *  - `shell`: an interactive prompt with local echo, backspace, ⌃C and a
 *    small table of canned commands. Enough to make typing feel real; it is
 *    honest about being a demo when asked to do anything else.
 *
 * Everything is bytes (Uint8Array of UTF-8) because that is what the real
 * bridge delivers and what xterm.write receives in the app.
 */

const enc = new TextEncoder();

export type TermSink = (chunk: Uint8Array) => void;

/** One timed reveal in a scripted transcript. */
export interface ScriptStep {
  /** Milliseconds after the previous step. */
  delay: number;
  /** Raw text, may contain ANSI escapes and \r\n. */
  text: string;
}

const CRLF = '\r\n';

export class DemoTerminal {
  private sinks = new Set<TermSink>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private started = false;
  /** Bytes already emitted, replayed to a late subscriber (re-attach). */
  private history: string[] = [];
  private line = '';

  constructor(
    private readonly opts: {
      prompt?: string;
      script?: ScriptStep[];
      /** Canned command table for interactive mode. */
      commands?: Record<string, string>;
      /**
       * Interactive reply when the input matches nothing in `commands`.
       * Set for agent-flavored sessions (an agent answers prose; a shell
       * lists its commands). `{input}` is replaced with what was typed.
       */
      defaultReply?: string;
      loop?: boolean;
      /**
       * Pre-typed input waiting at the prompt after the script ends (the
       * armed resume command of a restored session). The script is expected
       * to have PRINTED it; this makes Enter actually submit it.
       */
      seedLine?: string;
      /** Suppress the fresh prompt the engine appends after a script. */
      noPromptAfterScript?: boolean;
    }
  ) {}

  subscribe(cb: TermSink): () => void {
    this.sinks.add(cb);
    return () => this.sinks.delete(cb);
  }

  /** Called on sessions.attach: paint history or start the show. */
  attach(): void {
    if (this.started) {
      // Re-attach: replay what the screen already said.
      const past = this.history.join('');
      if (past) this.emitNow(past, false);
      return;
    }
    this.started = true;
    const script = this.opts.script ?? [];
    let at = 0;
    const run = (from: number): void => {
      let acc = 0;
      for (let i = from; i < script.length; i++) {
        const step = script[i]!;
        acc += step.delay;
        this.timers.push(
          setTimeout(() => {
            this.emitNow(step.text);
            if (i === script.length - 1) {
              if (this.opts.loop) {
                this.timers.push(setTimeout(() => run(0), 4000));
              } else if (
                this.opts.prompt !== undefined &&
                !this.opts.noPromptAfterScript
              ) {
                this.emitNow(CRLF + this.promptText());
              }
              if (this.opts.seedLine !== undefined)
                this.line = this.opts.seedLine;
            }
          }, acc)
        );
      }
      at = acc;
    };
    if (script.length > 0) {
      run(0);
    } else if (this.opts.prompt !== undefined) {
      this.timers.push(setTimeout(() => this.emitNow(this.promptText()), at));
    }
  }

  /** Bytes the user typed (already routed through xterm's onData). */
  input(data: string | Uint8Array): void {
    const text =
      typeof data === 'string' ? data : new TextDecoder().decode(data);
    // Scripted sessions ignore typing; they are a film, not a prop shell.
    if (this.opts.prompt === undefined) return;
    for (const ch of text) {
      if (ch === '\r' || ch === '\n') {
        this.emitNow(CRLF);
        this.execute(this.line.trim());
        this.line = '';
      } else if (ch === '\x7f' || ch === '\b') {
        if (this.line.length > 0) {
          this.line = this.line.slice(0, -1);
          this.emitNow('\b \b');
        }
      } else if (ch === '\x03') {
        this.line = '';
        this.emitNow('^C' + CRLF + this.promptText());
      } else if (ch >= ' ' || ch === '\t') {
        this.line += ch;
        this.emitNow(ch);
      }
    }
  }

  dispose(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    this.sinks.clear();
  }

  private promptText(): string {
    return this.opts.prompt ?? '';
  }

  private execute(cmd: string): void {
    if (cmd === '') {
      this.emitNow(this.promptText());
      return;
    }
    const table = this.opts.commands ?? {};
    const first = cmd.split(/\s+/)[0]!;
    const canned = table[cmd] ?? table[first];
    const reply =
      canned ??
      this.opts.defaultReply?.replaceAll('{input}', cmd) ??
      `\x1b[2mThis is the tortie.sh demo — '${first}' isn't wired up here. Try: ${Object.keys(
        table
      )
        .filter((k) => !k.includes(' '))
        .join(', ')}\x1b[0m`;
    this.emitNow(reply.replaceAll('\n', CRLF) + CRLF + this.promptText());
  }

  private emitNow(text: string, remember = true): void {
    if (remember) {
      this.history.push(text);
      // A demo runs for minutes, not days; still, keep the replay bounded.
      if (this.history.length > 4000) this.history.splice(0, 2000);
    }
    const bytes = enc.encode(text);
    for (const cb of this.sinks) cb(bytes);
  }
}
