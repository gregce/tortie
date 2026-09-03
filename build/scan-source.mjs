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

/** The text from `from` to the `;` that ends its statement, brackets matched. */
function statementFrom(code, from) {
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
    if ('(['.includes(c) || c === '{') depth += 1;
    else if (')]'.includes(c) || c === '}') {
      depth -= 1;
      if (depth < 0) return code.slice(from, i);
    } else if (c === ';' && depth === 0) return code.slice(from, i);
  }
  return code.slice(from);
}

/** The body of the function whose parameter list closes at `afterParams`, or null. */
function bodyAfter(code, afterParams) {
  let i = afterParams + 1;
  while (i < code.length && /\s/.test(code[i])) i += 1;
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
