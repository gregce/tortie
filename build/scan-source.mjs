/**
 * scan-source.mjs. Reading a JavaScript file well enough to say where a program
 * is handed to a spawn (Phase 193).
 *
 * ## Why this file exists
 *
 * `build/assert-electron-teardown.mjs` grew a small lexer to answer one
 * question: which call in this file passes an Electron to a spawn. Phase 193
 * needed the same answer about ssh, and the choice was to copy two hundred
 * lines or to move them. CLAUDE.md's growth guardrail settles it: grep for an
 * existing helper before writing one, and extract a duplicated block rather
 * than keep two.
 *
 * So the four functions both gates need live here, and neither gate owns them.
 * Nothing in this file knows what an Electron is or what ssh is. It reads
 * source text and answers structural questions about it, which is what makes it
 * shareable at all.
 *
 * ## What is in it
 *
 *   - {@link stripComments} blanks comments and regular expression bodies
 *     character for character, leaving strings alone, so every offset in the
 *     result still points at the same line of the original.
 *   - {@link lineAt} turns an offset into a 1-indexed line number.
 *   - {@link callArguments} splits the arguments of one call into source text.
 *   - {@link blockAt} returns the text between matching braces.
 *   - {@link closeOf} returns the index of the bracket matching an open one.
 *   - {@link namedFunctions} returns every function a file gives a name to,
 *     with its body, so a caller can ask what a local wrapper does.
 *   - {@link functionBodyOf} returns the body of ONE named function
 *     declaration, braces and all, for a gate that asks its question of one
 *     function rather than of a whole file.
 *   - {@link receiverOf} says what stands in front of a call name a gate
 *     matched: a regular expression it is a method of, any other receiver, a
 *     spread, the `function` keyword that declares it, or nothing (Phase 307).
 *
 * It spawns nothing, opens no socket and reads no file. Callers hand it text.
 */

/**
 * Whether the slash at `at` opens a regular expression rather than dividing.
 * The rule is the ordinary one: look back past spaces, and a slash that follows
 * an operator, an opening bracket, a comma, or one of a few keywords opens a
 * regex.
 */
function opensRegex(source, at) {
  let i = at - 1;
  while (i >= 0 && /\s/.test(source[i])) i -= 1;
  if (i < 0) return true;
  const c = source[i];
  if ('(,=:[!&|?{};+-*%~^<>'.includes(c)) return true;
  const word = /([A-Za-z_$][\w$]*)$/.exec(source.slice(Math.max(0, i - 12), i + 1));
  return word !== null && ['return', 'typeof', 'case', 'in', 'of', 'new'].includes(word[1]);
}

export function stripComments(source) {
  const out = source.split('');
  let i = 0;
  const n = source.length;
  let state = 'code';
  let quote = '';
  while (i < n) {
    const c = source[i];
    const d = source[i + 1];
    if (state === 'code') {
      if (c === '/' && d === '/') {
        state = 'line';
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        continue;
      }
      if (c === '/' && d === '*') {
        state = 'block';
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') {
        state = 'string';
        quote = c;
        i += 1;
        continue;
      }
      if (c === '/' && opensRegex(source, i)) {
        let j = i + 1;
        let inClass = false;
        while (j < source.length) {
          const r = source[j];
          if (r === '\\') {
            j += 2;
            continue;
          }
          if (r === '[') inClass = true;
          else if (r === ']') inClass = false;
          else if (r === '/' && !inClass) break;
          else if (r === '\n') break;
          j += 1;
        }
        for (let k = i + 1; k < j && k < source.length; k += 1) out[k] = ' ';
        i = j + 1;
        continue;
      }
      i += 1;
      continue;
    }
    if (state === 'line') {
      if (c === '\n') state = 'code';
      else out[i] = ' ';
      i += 1;
      continue;
    }
    if (state === 'block') {
      if (c === '*' && d === '/') {
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        state = 'code';
        continue;
      }
      if (c !== '\n') out[i] = ' ';
      i += 1;
      continue;
    }
    // state === 'string'
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === quote) {
      state = 'code';
      quote = '';
    }
    i += 1;
  }
  return out.join('');
}

/** The 1-indexed line number of an offset. */
export function lineAt(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

/**
 * The arguments of the call that opens at `open`, as source text, split at the
 * commas that sit at depth zero. Quotes and brackets are tracked so a comma
 * inside an array or a string never splits an argument.
 */
export function callArguments(source, open) {
  const args = [];
  let depth = 0;
  let current = '';
  let quote = '';
  for (let i = open; i < source.length; i += 1) {
    const c = source[i];
    if (quote !== '') {
      current += c;
      if (c === '\\') {
        current += source[i + 1] ?? '';
        i += 1;
        continue;
      }
      if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      current += c;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') {
      depth += 1;
      if (depth === 1 && i === open) continue;
      current += c;
      continue;
    }
    if (c === ')' || c === ']' || c === '}') {
      depth -= 1;
      if (depth === 0) {
        args.push(current.trim());
        return args;
      }
      current += c;
      continue;
    }
    if (c === ',' && depth === 1) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += c;
  }
  args.push(current.trim());
  return args;
}



/** The text between the braces that open at `open`, braces matched. */
export function blockAt(code, open) {
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === '{') depth += 1;
    else if (code[i] === '}') {
      depth -= 1;
      if (depth === 0) return code.slice(open + 1, i);
    }
  }
  return null;
}

/**
 * The index of the bracket that closes the one at `open`, or -1.
 *
 * Quotes are tracked, because {@link stripComments} deliberately leaves strings
 * alone, so a bracket inside one must not be counted.
 */
export function closeOf(code, open) {
  const opener = code[open];
  const closer = { '(': ')', '[': ']', '{': '}' }[opener];
  if (closer === undefined) return -1;
  let depth = 0;
  let quote = '';
  for (let i = open; i < code.length; i += 1) {
    const c = code[i];
    if (quote !== '') {
      if (c === '\\') {
        i += 1;
        continue;
      }
      if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      continue;
    }
    if (c === opener) depth += 1;
    else if (c === closer) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * The simple identifier names in one parameter list that have NO default.
 *
 * A PARAMETER CARRYING A DEFAULT IS NOT THE CALLER'S VALUE ALONE.
 * `function connect(host, bin = '/usr/bin/ssh')` names the client in the
 * file's own text, and that is an ordinary way to write a wrapper, so `bin`
 * must keep resolving. Only a bare parameter stands for whatever the caller
 * passed, and only a bare parameter is collected here.
 *
 * A DESTRUCTURED PARAMETER IS DELIBERATELY NOT READ either. These names are
 * only ever used to SUPPRESS a finding, and over-suppression hides a defect
 * while under-suppression only prints one a person can dismiss. This gate fails
 * closed, so both ambiguous shapes keep the finding.
 */
function parameterNames(text) {
  const names = new Set();
  let depth = 0;
  let quote = '';
  let current = '';
  const take = (piece) => {
    const one = /^\s*(?:\.\.\.)?\s*([A-Za-z_$][\w$]*)\s*$/.exec(piece);
    if (one !== null) names.add(one[1]);
  };
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quote !== '') {
      if (c === '\\') {
        i += 1;
        continue;
      }
      if (c === quote) quote = '';
      current += c;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      current += c;
      continue;
    }
    if ('([{'.includes(c)) depth += 1;
    else if (')]}'.includes(c)) depth -= 1;
    if (c === ',' && depth === 0) {
      take(current);
      current = '';
      continue;
    }
    current += c;
  }
  take(current);
  return names;
}

/**
 * Every function's parameter names paired with the span of its body.
 *
 * WHY A FLAT TABLE OF NAMES IS NOT ENOUGH. A scanner that resolves a name to a
 * value anywhere in a file will resolve a WRAPPER'S OWN PARAMETER to whatever
 * some unrelated line assigned to that name. `probe-control-dialect.mjs` holds
 * both halves: `function sh(file, args)` forwards its own `file` to a spawn,
 * and three hundred lines away `file = sshBin` names the client. Reading the
 * two as one name reports the wrapper's definition as a client spawn, which is
 * noise on exactly the generic helper every script in this tree has.
 *
 * So a name is refused resolution inside a function that declares it as a
 * parameter, and nowhere else. Only block bodies are recorded, since an
 * expression bodied arrow cannot contain the multi statement wrapper this
 * exists for.
 */
export function parameterScopes(code) {
  const scopes = [];
  const header =
    /\b(?:async\s+)?function\s*\*?\s*[A-Za-z_$][\w$]*\s*\(|\b(?:async\s+)?function\s*\*?\s*\(|\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s+)?\(/g;
  let m;
  while ((m = header.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = closeOf(code, open);
    if (close === -1) continue;
    const names = parameterNames(code.slice(open + 1, close));
    if (names.size === 0) continue;
    let i = close + 1;
    while (i < code.length && /\s/.test(code[i])) i += 1;
    if (code[i] === '=' && code[i + 1] === '>') {
      i += 2;
      while (i < code.length && /\s/.test(code[i])) i += 1;
    }
    if (code[i] !== '{') continue;
    const end = closeOf(code, i);
    if (end === -1) continue;
    scopes.push({ names, start: i, end });
  }
  return scopes;
}

/** Whether `name` is a parameter of some function whose body contains `at`. */
export function shadowedAt(scopes, name, at) {
  return scopes.some((one) => at > one.start && at < one.end && one.names.has(name));
}

/**
 * Where the statement that starts at `from` stops, brackets matched and quotes
 * respected: the index of the `;` ending it at depth 0, or of the bracket that
 * closes the block it sits in, or -1 when neither comes. The one statement
 * reader; {@link statementEnd} and `statementFrom` are its two answers.
 */
function statementStop(code, from) {
  let depth = 0;
  let quote = '';
  for (let i = from; i < code.length; i += 1) {
    const c = code[i];
    if (quote !== '') {
      if (c === '\\') {
        i += 1;
        continue;
      }
      if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') {
      depth -= 1;
      if (depth < 0) return i;
    } else if (c === ';' && depth === 0) return i;
  }
  return -1;
}

/**
 * The index just past the `;` ending the statement that starts at `from`, or
 * of the bracket closing the block it sits in, or -1 (Phase 326, moved here
 * from `conformance-farattach.mjs` so the statement reader exists once).
 */
export function statementEnd(code, from) {
  const at = statementStop(code, from);
  if (at === -1) return -1;
  return code[at] === ';' ? at + 1 : at;
}

/** The text from `from` to the `;` that ends its statement, brackets matched. */
function statementFrom(code, from) {
  const at = statementStop(code, from);
  return at === -1 ? code.slice(from) : code.slice(from, at);
}

/** The body of the function whose parameter list closes at `afterParams`, or null. */
function bodyAfter(code, afterParams) {
  let i = afterParams + 1;
  while (i < code.length && /\s/.test(code[i])) i += 1;
  // A TYPESCRIPT RETURN TYPE SITS HERE, and until Phase 240 this reader stopped
  // dead on one. `const save = async (id: string): Promise<boolean> => {…}` is
  // the ordinary shape of every arrow bound function in src/, and this returned
  // null for all of them, so `namedFunctions` could read a gate script and not
  // a source file. Nothing under build/ has an annotation in this position, so
  // the two spawn gates that share this helper read exactly what they read
  // before. The scan stops at the first `=>` OUTSIDE any bracket, so a type
  // that is itself a function, e.g. `(): (() => void) =>`, is not mistaken for
  // the arrow, and a `;` outside any bracket abandons the attempt rather than
  // running away down the file.
  //
  // PHASE 240'S FIX ROUND ADDED THE ANGLE BRACKETS, and they are brackets here
  // for the same reason the round ones are. `<` and `>` were not counted, so a
  // function type inside a TYPE ARGUMENT closed nothing and its own arrow was
  // read as the function's: `(id: string): Record<string, () => void> => {…}`
  // gave back the body `void> => { … }`, which is a wrong body rather than a
  // null one, in a helper four gates share. A `>` is only ever a closing angle
  // when one is open and the character before it is not `=`, so the `>` of an
  // arrow can never close a type argument, and an unbalanced `<` — a genuine
  // comparison, which no return type holds — leaves `angle` above zero and the
  // scan runs to the `;` clause and abandons the attempt rather than guessing.
  if (code[i] === ':') {
    let depth = 0;
    let angle = 0;
    let j = i + 1;
    for (; j < code.length; j += 1) {
      const c = code[j];
      if (c === '(' || c === '[' || c === '{') depth += 1;
      else if (c === ')' || c === ']' || c === '}') depth -= 1;
      else if (c === '<') angle += 1;
      else if (c === '>' && angle > 0 && code[j - 1] !== '=') angle -= 1;
      else if (depth === 0 && angle === 0 && c === ';') return null;
      if (depth === 0 && angle === 0 && code.startsWith('=>', j)) break;
      if (depth < 0) return null;
    }
    if (j >= code.length) return null;
    i = j;
  }
  if (code.startsWith('=>', i)) {
    i += 2;
    while (i < code.length && /\s/.test(code[i])) i += 1;
  } else if (code[i] !== '{') {
    // Neither an arrow nor a block, so the parentheses were an expression.
    return null;
  }
  if (code[i] === '{') return blockAt(code, i);
  return statementFrom(code, i);
}

/**
 * Every function this file gives a name to, by name, with its body as text.
 *
 * THE POINT OF IT, because the name alone does not say. A gate that asks "which
 * calls in this file start a program" cannot answer from a hard coded list of
 * call names: almost every probe under build/ declares its own
 * `function sh(file, args, options = {})` around its line 100 and spawns
 * through that, and a probe that called the same wrapper `connect` would be
 * invisible to a list. With this, a caller discovers the wrappers instead of
 * being told them.
 *
 * Four shapes are read, being every one this tree writes: a `function`
 * declaration, a `const` bound to an arrow with a block body, a `const` bound to
 * an arrow with an expression body, and a `const` bound to a `function`
 * expression. A method inside an object or a class is not read, and neither is a
 * function with no name.
 */
export function namedFunctions(code) {
  const bodies = new Map();

  const declared = /\b(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = declared.exec(code)) !== null) {
    const params = closeOf(code, m.index + m[0].length - 1);
    if (params === -1) continue;
    const open = code.indexOf('{', params);
    if (open === -1) continue;
    const body = blockAt(code, open);
    if (body !== null) bodies.set(m[1], body);
  }

  const bound =
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\s*\*?\s*[A-Za-z_$\w$]*\s*)?\(/g;
  while ((m = bound.exec(code)) !== null) {
    const params = closeOf(code, m.index + m[0].length - 1);
    if (params === -1) continue;
    const body = bodyAfter(code, params);
    if (body !== null) bodies.set(m[1], body);
  }

  const oneArg = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?[A-Za-z_$][\w$]*\s*=>/g;
  while ((m = oneArg.exec(code)) !== null) {
    let i = m.index + m[0].length;
    while (i < code.length && /\s/.test(code[i])) i += 1;
    const body = code[i] === '{' ? blockAt(code, i) : statementFrom(code, i);
    if (body !== null) bodies.set(m[1], body);
  }

  return bodies;
}

/**
 * The body of the FUNCTION DECLARATION called `name` in `code`, braces and all,
 * or null when the file declares no such function.
 *
 * WHY THIS IS NOT {@link namedFunctions}. That one answers "every wrapper this
 * file declares", which is the spawn gates' question. Two conformance gates ask
 * a narrower one: is this particular call inside THIS particular function, and
 * where in it. `build/conformance-credentials.mjs` asks whether
 * `disposeMainCapabilities` closes admission before its first await, and
 * `build/conformance-logins.mjs` asks whether the one function every login
 * change answers through pushes `logins:changed`. Both need the braces of one
 * named function and nothing else, because a call in some other function of the
 * same file is not a call in this one.
 *
 * It takes code a caller has ALREADY stripped, the way {@link namedFunctions}
 * does, so a gate keeps whichever comment stripper the rest of its rules use
 * and this helper does not quietly change what those rules read.
 *
 * The parameter list is skipped through {@link closeOf} rather than by finding
 * the first `{`, so a destructured or defaulted parameter cannot be mistaken
 * for the body.
 */
export function functionBodyOf(code, name) {
  const declared = new RegExp(`\\b(?:async\\s+)?function\\s*\\*?\\s*${name}\\s*\\(`);
  const m = declared.exec(code);
  if (m === null) return null;
  const params = closeOf(code, m.index + m[0].length - 1);
  if (params === -1) return null;
  const open = code.indexOf('{', params);
  if (open === -1) return null;
  const inner = blockAt(code, open);
  return inner === null ? null : `{${inner}}`;
}

/**
 * Every value a name is ever assigned in one file, as the text of each.
 *
 * A NAME IS NOT ONLY WHAT ITS DECLARATION SAYS, and reading only declarations
 * was a hole a verifier walked through twice. This tree held the proof at
 * `probe-control-dialect.mjs:375` before Phase 193: `let file;` declares
 * nothing, two plain assignments on later lines give it `program` on one branch
 * and `sshBin` on the other, and `sshBin` is the ssh client. A reader that
 * wants a declaration with a literal on its right sees none of that and calls
 * the file clean. Phase 206's fix round found the same hole in a second gate,
 * where `const BURN = 'while :; do :; done'` and `const OPTS = { detached:
 * true }` made a load generator invisible.
 *
 * So every assignment to a name is collected, wherever it is and however many
 * there are, and a right hand side that is a CHOICE contributes its pieces as
 * well as itself. `const bin = process.env.TORTIE_SSH || '/usr/bin/ssh'` and
 * `const file = remote ? SSH_BIN : program` are both read here, and so is
 * `file = sshBin;` standing on its own line.
 *
 * A name that CAN hold the thing asked about is read as holding it. A scanner
 * cannot know which way a question goes at run time, and the safe reading is
 * the one that fails closed.
 *
 * The `=` is required not to be part of `==`, `===`, `=>`, `+=` or any other
 * compound, which is what keeps a comparison from being read as an assignment.
 *
 * IT IS TEXT AND NOT A SCOPE CHAIN. A caller that must not read a name the
 * function it is looking at declares as a parameter asks {@link parameterScopes}
 * and {@link shadowedAt} as well; see build/assert-known-hosts-scoped.mjs.
 */
export function assignedValues(code) {
  const out = new Map();
  const add = (name, text) => {
    const piece = (text ?? '').trim();
    if (piece === '') return;
    const held = out.get(name);
    if (held === undefined) out.set(name, [piece]);
    else if (!held.includes(piece)) held.push(piece);
  };
  const assigned = /(?:^|[^=!<>+\-*/%&|^~\w$])([A-Za-z_$][\w$]*)\s*=(?![=>])\s*([^;\n]*)/g;
  let m;
  while ((m = assigned.exec(code)) !== null) {
    const rhs = m[2].trim();
    add(m[1], rhs);
    if (/\|\||\?\?|\?/.test(rhs)) {
      for (const piece of rhs.split(/\|\||\?\?|\?|:/)) add(m[1], piece);
    }
  }
  return out;
}

/**
 * Every function's parameters paired with the span of its body, read WIDE on
 * purpose (Phase 307): every identifier inside a parameter list, defaults and
 * destructuring included, and an arrow's expression body as well as a block.
 *
 * {@link parameterScopes} reads narrow, because its names only ever SUPPRESS a
 * finding, and over-suppression hides a defect. These names do the opposite:
 * a name a function takes as a parameter is the caller's value inside that
 * function, so a regular expression this file assigns under the same name is
 * not what the function's call is made on, and the site stays a candidate.
 * Reading too many names here keeps more sites read, which is the direction a
 * gate fails closed.
 */
function bindingScopes(code) {
  const scopes = [];
  const add = (text, start, end) => {
    if (end !== -1) scopes.push({ names: new Set(text.match(/[A-Za-z_$][\w$]*/g) ?? []), start, end });
  };
  // A declared function or a function expression, past a TypeScript return
  // type when there is one.
  const declared = /\bfunction\b\s*\*?\s*[A-Za-z_$]?[\w$]*\s*\(/g;
  let m;
  while ((m = declared.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = closeOf(code, open);
    if (close === -1) continue;
    const brace = /^\s*(?::[^{;=]*)?\{/.exec(code.slice(close + 1, close + 300));
    if (brace === null) continue;
    const at = close + brace[0].length;
    add(code.slice(open + 1, close), at, closeOf(code, at));
  }
  // An arrow, read BACK from its `=>`, so the matcher is never run from a
  // bracket that is not a parameter list: `(params) =>` or `name =>`.
  const arrow = /=>/g;
  while ((m = arrow.exec(code)) !== null) {
    let i = m.index - 1;
    while (i >= 0 && /\s/.test(code[i])) i -= 1;
    let text = null;
    if (code[i] === ')') {
      const open = parenBefore(code, i);
      if (open !== -1) text = code.slice(open + 1, i);
    } else {
      text = /([A-Za-z_$][\w$]*)$/.exec(code.slice(Math.max(0, i - 64), i + 1))?.[1] ?? null;
    }
    if (text === null) continue;
    let after = m.index + 2;
    while (after < code.length && /\s/.test(code[after])) after += 1;
    add(text, after - 1, code[after] === '{' ? closeOf(code, after) : statementEnd(code, after));
  }
  return scopes;
}

/**
 * The parenthesis that opens the one closing at `close`, read backward, or
 * -1. A string the walk meets is skipped back to its opening quote on the same
 * line; one it cannot bound there, or a list longer than any parameter list,
 * is -1, a scope not recorded.
 */
function parenBefore(code, close) {
  let depth = 0;
  for (let i = close; i >= 0 && close - i < 4000; i -= 1) {
    const c = code[i];
    if (c === "'" || c === '"' || c === '`') {
      const open = code.lastIndexOf(c, i - 1);
      if (open === -1 || open < code.lastIndexOf('\n', i - 1)) return -1;
      i = open;
      continue;
    }
    if (c === ')') depth += 1;
    else if (c === '(') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Whether `name` is bound anywhere in the file by something other than an `=`
 * {@link assignedValues} reads: a destructuring declaration, a `for` head, a
 * `catch` clause, an import, or a function or class declaration (the probe
 * review of Phase 352). Such a binding can hold a child process under a name
 * the file elsewhere assigns nothing but a regular expression, and
 * `const { proc } = { proc: child }; proc.spawn(…)`, the same through
 * `for (const proc of …)` and through `catch (proc)`, each walked past the
 * background gate with a detached loop while the parent found them. A name
 * bound so is never read as a regular expression, which keeps every one of its
 * sites read: the direction these gates fail closed.
 *
 * AND A DESTRUCTURING ASSIGNMENT, with no keyword before it (the fix round of
 * Phase 352). `[proc] = [child]` and `({ proc } = { proc: child })` rebind a
 * name the file declared with `let proc = /x/;`, and the three patterns above
 * each want a `const`, a `let` or a `var` in front of the bracket, so
 * `proc.spawn('/bin/sh', ['-c', LOOP], { detached: true })` walked past the
 * background gate and `cp.execFile('ssh', …)` after `[cp] = [child]` past the
 * known-hosts gate, both found at the parent (the verify lens's fixtures v01,
 * v02 and k02, now in build/background-fixtures.mjs and
 * build/known-hosts-fixtures.mjs).
 */
function boundOtherwise(code, name) {
  const n = name.replace(/\$/g, '\\$');
  const word = `(?<![\\w$.])${n}(?![\\w$])`;
  if (
    new RegExp(
      `\\b(?:const|let|var)\\s*[{[][^=;]*${word}` +
        `|\\bfor\\s*(?:await\\s*)?\\(\\s*(?:const|let|var)?[^;)]*?${word}[^;)]*?\\b(?:of|in)\\b` +
        `|\\bcatch\\s*\\(\\s*[^)]*${word}` +
        `|\\bimport\\b[^;]*?${word}[^;]*?\\bfrom\\b` +
        `|\\b(?:function|class)\\s*\\*?\\s*${n}(?![\\w$])`
    ).test(code)
  ) {
    return true;
  }
  return assignmentTargetsOf(code).some((target) => new RegExp(word).test(target));
}

/** One file's destructuring assignment targets, read once per text. */
let targetsRead = { code: null, targets: [] };

/**
 * The text inside every destructuring ASSIGNMENT target in `code`: the bracket
 * that closes just before an `=` which is not `==`, `===` or `=>`, read back to
 * the bracket that opens it. A `[` straight after a name, a `)` or a `]` is a
 * member access (`values[i] = …`) and not a pattern, so it is passed over. A
 * type annotation's braces before an `=` read as a target too, which keeps more
 * names read, the direction this file's gates fail closed.
 */
function assignmentTargetsOf(code) {
  if (targetsRead.code === code) return targetsRead.targets;
  const targets = [];
  const assign = /[\]}]\s*=(?![=>])/g;
  let m;
  while ((m = assign.exec(code)) !== null) {
    const open = openerBefore(code, m.index);
    if (open === -1) continue;
    if (code[open] === '[') {
      let p = open - 1;
      while (p >= 0 && /\s/.test(code[p])) p -= 1;
      if (p >= 0 && /[\w$)\]]/.test(code[p])) continue;
    }
    targets.push(code.slice(open + 1, m.index));
  }
  targetsRead = { code, targets };
  return targets;
}

/**
 * The bracket that opens the one closing at `close`, read backward over every
 * kind of bracket, or -1. A string the walk meets is skipped back to its
 * opening quote on the same line; one it cannot bound there is -1.
 */
function openerBefore(code, close) {
  let depth = 0;
  for (let i = close; i >= 0 && close - i < 4000; i -= 1) {
    const c = code[i];
    if (i !== close && (c === "'" || c === '"' || c === '`')) {
      const open = code.lastIndexOf(c, i - 1);
      if (open === -1 || open < code.lastIndexOf('\n', i - 1)) return -1;
      i = open;
      continue;
    }
    if (c === ')' || c === ']' || c === '}') depth += 1;
    else if (c === '(' || c === '[' || c === '{') {
      depth -= 1;
      if (depth === 0) return c === '(' ? -1 : i;
    }
  }
  return -1;
}

/** A right hand side that is a regular expression: a stripped literal, or a `RegExp`. */
function regexValue(text) {
  const t = String(text ?? '').trim();
  return /^\/ +\/[dgimsuyv]*$/.test(t) || /^(?:new\s+)?RegExp\s*\(/.test(t);
}

/**
 * What {@link receiverOf} needs to know about one whole file (Phase 307): the
 * names it assigns NOTHING BUT a regular expression, and where each function
 * takes a name as a parameter, so a method called on one of those names is a
 * method of a regular expression everywhere but inside such a function.
 * `code` is text {@link stripComments} has blanked, and `values` its
 * {@link assignedValues}, handed in by a caller that has them already. The
 * scopes are read the first time a regular expression's name is met, so a file
 * that calls a method on none pays nothing for them.
 */
export function receiverContext(code, values = assignedValues(code)) {
  const regexNames = new Set();
  for (const [name, pieces] of values) {
    if (pieces.length > 0 && pieces.every(regexValue) && !boundOtherwise(code, name)) regexNames.add(name);
  }
  let scopes = null;
  return {
    regexNames,
    get scopes() {
      if (scopes === null) scopes = bindingScopes(code);
      return scopes;
    }
  };
}

/**
 * PHASE 307. What stands in front of the call name that starts at `at` in
 * `code`, being text {@link stripComments} has blanked.
 *
 * WHY A GATE THAT FINDS CALLS BY NAME NEEDS THIS. `exec` names a process
 * starter and a regular expression's method, and `\bexec\s*\(` matches both,
 * because `\b` sits between the `.` and the name. build/assert-background-
 * teardown.mjs read `/^rgba?\(([^)]*)\)$/i.exec(raw)` beside
 * `const raw = 'sleep 900'` as a runner nothing holds, which no `finally` can
 * ever clear, so build/p293/probe-p293.mjs was routed around the gate rather
 * than the gate weakened; and 252 of the 269 functions it read under build/ as
 * process starters were read so only because a body held a method call named
 * `exec`, `spawn` or `fork`. The same pattern reads `function other(cmd)` as a
 * call of `other`.
 *
 * Five answers, and a gate drops a site for the first or the fourth alone:
 *   'regex'        a method of a REGULAR EXPRESSION, in one of the three shapes
 *                  measured for Phase 307: a literal ending in `/`
 *                  (`/x/.exec(s)`), a literal's flag run after its `/`
 *                  (`/x/i.exec(s)`), or a name this file assigns nothing but a
 *                  regex literal or a `RegExp`, called outside every function
 *                  that takes that name as a parameter (`RGB.exec(s)` after
 *                  `const RGB = /x/i;`).
 *   'member'       a method of anything else (`cp.spawn(…)`). It stays a
 *                  candidate: a receiver that cannot be SHOWN to be a regular
 *                  expression is read as one that is not.
 *   'spread'       `...start(…)`, whose `.` is a spread rather than a member
 *                  access, and which is a call.
 *   'declaration'  `function start(…)`, where a function is DEFINED, spelled the
 *                  way build/assert-known-hosts-scoped.mjs has spelled it since
 *                  Phase 193.
 *   'plain'        anything else.
 *
 * Nothing else is inferred. A regular expression reached through a parameter,
 * a property or a loop variable reads 'member' and stays a candidate, which is
 * the direction every gate here fails closed.
 *
 * `context` is {@link receiverContext} of the same code, computed once per
 * file by a caller that asks about many sites.
 */
export function receiverOf(code, at, context = receiverContext(code)) {
  if (/\bfunction\s*\*?\s*$/.test(code.slice(Math.max(0, at - 24), at))) return 'declaration';
  const before = code.slice(Math.max(0, at - 400), at);
  if (/\.\.\.\s*$/.test(before)) return 'spread';
  const dot = /\.\s*$/.exec(before);
  if (dot === null) return 'plain';
  const receiver = before.slice(0, dot.index);
  // A SLASH AFTER A POSTFIX `++` OR `--` DIVIDES (the fix round of Phase 352).
  // stripComments reads it as opening a literal, because the character before
  // it is a `+` or a `-`, and blanks up to the next slash, so
  // `i++ / 2 /ms.spawn(…)` reached the two shapes below as a literal's flag run
  // and a namespace whose name is only flag letters dropped a real start the
  // parent found. A receiver like that is not shown to be a regular
  // expression, so it is read as one that is not.
  if (/[\w$)\]]\s*(?:\+\+|--)\s*\/ +\/[dgimsuyv]*\s*$/.test(receiver)) return 'member';
  // A literal ending in `/`: stripComments keeps its two slashes and blanks
  // its body, so it reads slash, spaces, slash. A slash after a name divides.
  if (/\/ +\/\s*$/.test(receiver)) return 'regex';
  // A literal's flag run after its closing slash.
  if (/\/ +\/[dgimsuyv]+\s*$/.test(receiver)) return 'regex';
  // A name this file only ever assigns a regular expression, and not a
  // property of something else that happens to share the name, nor a
  // parameter of a function the call sits in, where it is the caller's value.
  const name = /(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*$/.exec(receiver);
  if (name !== null && context.regexNames.has(name[1]) && !shadowedAt(context.scopes, name[1], at)) {
    return 'regex';
  }
  return 'member';
}
