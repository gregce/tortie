/**
 * Phase 18 item 6 — the product is called Tortie wherever the USER can read it.
 *
 * This is the executable half of an AUDIT, not a rename. The distinction is the
 * whole point, and CLAUDE.md states the stakes: the identifier strands live
 * data is bound to (`-L gmux`, `resources/gmux-tmux.conf`, the `@gmux-*`
 * session options, `GMUX_SESSION_ID`/`GMUX_MANAGED`, the inner
 * `<userData>/gmux/` directory, `window.gmux`, `gmux-asset:`, the `gmux.*`
 * localStorage keys and the `gmux-*` CSS classes) MUST NOT be renamed —
 * renaming the first five strands every session running right now. Prose in
 * comments that says "gmux" is fine and deliberate, and is not scanned here.
 *
 * So the rule this test enforces is narrow and precise:
 *
 *   In non-test source, every STRING LITERAL and every JSX TEXT NODE that
 *   contains "gmux" must be explained — either it is one of the technical
 *   tokens below (an identifier, an env var, a path, a console prefix), or it
 *   is in a file allow-listed with a reason. Anything left over is text a user
 *   could read, and it must say "Tortie".
 *
 * The scan runs over `src/**` (main, renderer and shared alike) rather than
 * just the renderer: "user-visible" includes a main-process error message that
 * surfaces in the SCM pane, which is exactly where two of the five defects
 * this test was written against were found.
 *
 * IT USES THE TYPESCRIPT PARSER, and that is the fix round's correction rather
 * than a preference. The first version tokenized by hand and matched JSX text
 * with `/> *([^<>{}]*[A-Za-z][^<>{}]*?) *</g` — text anchored between a literal
 * `>` and `<` with no braces in between. It passed, 4/4, while this was on
 * screen in the running app (src/renderer/editor/image/ImageView.tsx):
 *
 *     {name} is {formatBytes(source.bytes)}. gmux previews images up to{' '}
 *
 * The sentence sits BETWEEN two interpolations, so the regex never saw it. Any
 * copy with a value in the middle of it — which is most copy worth auditing —
 * escaped the audit. That is a class of hole, not one miss, and no amount of
 * regex repair closes it: the only thing that knows where a JSX text node ends
 * is a JSX parser. `ts.createSourceFile` is already a devDependency, costs
 * ~1s over the whole tree, and finds every string, every template chunk and
 * every JSX text node by construction.
 *
 * HOW TO FIX A FAILURE: say "Tortie" in the string. Add an allow-list entry
 * ONLY if the text is genuinely not user-visible, and say why in the entry.
 * Never resolve a failure by renaming an identifier strand.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '..', '..');
const REPO = resolve(SRC, '..');

// ---------------------------------------------------------------------------
// Tokenizer — string contents and JSX text, with comments removed
// ---------------------------------------------------------------------------

interface Literal {
  text: string;
  line: number;
  /** What the parser found it to be — quoted in the failure report. */
  kind: 'string' | 'template' | 'jsx-text';
}

/**
 * Every piece of authored TEXT in a file: string literals, each literal chunk
 * of a template (the interpolations are expressions, not text), and JSX text
 * nodes. Comments are not nodes, so they are excluded by construction rather
 * than by a tokenizer that has to be right about `'https://…'`.
 *
 * Module specifiers are skipped: `import … from './gmux-thing'` is a path, and
 * a path that resolves is not a sentence anyone reads.
 */
function extract(file: string, src: string): Literal[] {
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const out: Literal[] = [];
  const lineOf = (pos: number): number =>
    sf.getLineAndCharacterOfPosition(pos).line + 1;

  const isModuleSpecifier = (node: ts.Node): boolean => {
    const p = node.parent;
    return (
      p !== undefined &&
      ((ts.isImportDeclaration(p) && p.moduleSpecifier === node) ||
        (ts.isExportDeclaration(p) && p.moduleSpecifier === node) ||
        ts.isImportTypeNode(p) ||
        (ts.isCallExpression(p) &&
          p.expression.kind === ts.SyntaxKind.ImportKeyword))
    );
  };

  const walk = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isModuleSpecifier(node)) {
        out.push({ text: node.text, line: lineOf(node.pos), kind: 'string' });
      }
    } else if (
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      out.push({ text: node.text, line: lineOf(node.pos), kind: 'template' });
    } else if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (text !== '') out.push({ text, line: lineOf(node.pos), kind: 'jsx-text' });
    }
    ts.forEachChild(node, walk);
  };

  walk(sf);
  return out;
}

// ---------------------------------------------------------------------------
// The technical tokens — each is an identifier, not a word the user reads
// ---------------------------------------------------------------------------

/**
 * Every occurrence of one of these is REMOVED from a candidate string before
 * the residue is checked. A string survives only if, once every technical
 * token is gone, no "gmux" remains.
 *
 * Order matters: longer, more specific forms come first so a path is consumed
 * whole rather than leaving a fragment behind.
 */
const TECHNICAL: { pattern: RegExp; why: string }[] = [
  // Protected strand — the pane env stamps, plus every other GMUX_ env var and
  // marker used by the smoke/shot/conformance harnesses.
  { pattern: /GMUX[_-][A-Z0-9_-]+/g, why: 'env vars and markers (GMUX_SESSION_ID, GMUX_MANAGED, GMUX_SMOKE, …)' },
  // Protected strand — filesystem and bundle paths.
  { pattern: /com\.specstory\.gmux/g, why: 'the OLD bundle id, read by the migration' },
  { pattern: /github\.com[:/][A-Za-z0-9_./-]*gmux[A-Za-z0-9_.-]*/g, why: 'git remote URLs in fixtures and parsers' },
  { pattern: /[<~/][A-Za-z0-9_.<>/-]*gmux[A-Za-z0-9_.<>/-]*/g, why: 'paths: <userData>/gmux/, ~/Library/Application Support/gmux, /Applications/gmux.app, the -L gmux socket dir' },
  { pattern: /-L\s+gmux/g, why: 'PROTECTED: the private tmux socket' },
  { pattern: /gmux-tmux\.conf/g, why: 'PROTECTED: the private tmux config' },
  // Trailing `-` allowed with nothing after it: the AST hands back a template
  // HEAD, so the `@gmux-${string}` type annotation arrives as the bare prefix.
  { pattern: /@gmux-[a-z${}-]*/g, why: 'PROTECTED: the tmux session options, including the `@gmux-${string}` template type' },
  { pattern: /window\.gmux/g, why: 'PROTECTED: the preload bridge' },
  { pattern: /gmux-asset/g, why: 'PROTECTED: the asset URL scheme' },
  { pattern: /gmux\.[A-Za-z][A-Za-z0-9_.]*/g, why: 'PROTECTED: gmux.* localStorage keys' },
  // Console prefixes. Developer-facing stderr, never a UI surface.
  { pattern: /\[gmux[a-z0-9 -]*\]/gi, why: 'console prefixes: [gmux], [gmux-conf], [gmux-smoke], [gmux-shot], [gmux search bench]' },
  { pattern: /gmux:\s(?=markdown|diff)/g, why: 'worker console-error prefixes ("gmux: diff parse worker failed")' },
  // Code identifiers that happen to live inside strings (channel names, symbol
  // names quoted in error text, describe() titles that name a function).
  { pattern: /__gmux[A-Za-z_]*/g, why: 'shot-harness globals (__gmuxShotDrive, __GMUX_PATH__)' },
  { pattern: /[A-Za-z]*Gmux[A-Za-z]*/g, why: 'type and function identifiers (GmuxError, openGmuxDatabase, GmuxCore)' },
  { pattern: /gmuxId/g, why: 'the manifest column name' },
  { pattern: /gmuxError|isGmuxError/g, why: 'error-constructor identifiers' },
  { pattern: /gmux:[a-z-]+/g, why: 'internal event channels (gmux:open-file, gmux:scm:manage-branches)' },
  { pattern: /x-gmux-[a-z-]+/g, why: 'the internal drag MIME type' },
  // PROTECTED: gmux-* CSS classes, plus the internal names built on the same
  // prefix (gmux-control, gmux-conformance, gmux-smoke-*, gmux-commit-*).
  { pattern: /gmux-[a-z0-9-]+/g, why: 'PROTECTED gmux-* CSS classes, and internal tmux/scratch names on the same prefix' },
  { pattern: /\bgmux\b(?=\.app)/g, why: 'the old app bundle name' }
];

/**
 * Files whose "gmux" strings are not user-visible for a reason that no pattern
 * can express. Each entry states the reason; adding one is a judgement call
 * that a reviewer must be able to check.
 */
const ALLOWED_FILES: { file: string; why: string }[] = [
  {
    file: 'src/main/agents/registry.ts',
    why: 'Documentation-as-data. The `quirks` and `notes` fields are measurement notes addressed to whoever next edits the registry; nothing in the renderer reads them (verified: no `.notes` / `.quirks` reference outside main).'
  },
  {
    file: 'src/main/migrate/notice.ts',
    why: 'The rename notice deliberately names the OLD app. It exists to tell the user what happened to the thing that used to be called gmux, and saying "Tortie" there would describe the wrong application.'
  },
  {
    file: 'src/main/migrate/userdata.ts',
    why: 'Migration internals plus [gmux-migrate] console output; the strings name the old install being read, not the running product.'
  },
  {
    file: 'src/main/migrate/smoke.ts',
    why: 'Developer smoke harness output (npm run smoke:migrate), never shown in the app.'
  },
  {
    file: 'src/main/conformance/resume.ts',
    why: 'Developer CLI output (npm run conformance:resume), never shown in the app.'
  },
  {
    file: 'src/main/index.ts',
    why: 'GMUX_SMOKE / GMUX_SHOT harness console output and tmux probe scripts, all behind env-var-gated dev entry points.'
  }
];

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      sourceFiles(p, out);
    } else if (/\.tsx?$/.test(p)) {
      out.push(p);
    }
  }
  return out;
}

/**
 * A string whose ENTIRE content is `gmux` is an identifier, never a sentence:
 * the tmux socket name, the `<userData>/gmux/` path segment, the
 * `exposeInMainWorld('gmux', …)` bridge key, a Monaco URI scheme, a
 * `Window['gmux']` type index. All are protected strands. No user-facing
 * message is the bare word on its own.
 */
function isBareIdentifier(text: string): boolean {
  return text.trim() === 'gmux';
}

/** Strip every technical token; whatever still says "gmux" is user-facing. */
function residue(text: string): string {
  // Comments embedded inside a template literal (the CSS-in-a-template blocks
  // the tree and the editor use) are still comments, and CLAUDE.md exempts
  // comment prose by name.
  let rest = text.replace(/\/\*[\s\S]*?\*\//g, ' ');
  for (const { pattern } of TECHNICAL) rest = rest.replace(pattern, ' ');
  return rest;
}

interface Finding {
  where: string;
  kind: Literal['kind'];
  text: string;
}

function scan(): Finding[] {
  const allowed = new Set(ALLOWED_FILES.map((a) => a.file));
  const findings: Finding[] = [];

  for (const file of sourceFiles(SRC)) {
    const rel = relative(REPO, file);
    if (allowed.has(rel)) continue;

    for (const lit of extract(file, readFileSync(file, 'utf8'))) {
      if (!/gmux/i.test(lit.text)) continue;
      if (isBareIdentifier(lit.text)) continue;
      if (!/gmux/i.test(residue(lit.text))) continue;
      findings.push({
        where: `${rel}:${lit.line}`,
        kind: lit.kind,
        text: lit.text.trim().slice(0, 120)
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------

describe('the product is called Tortie wherever the user can read it', () => {
  it('has no user-visible string or JSX text that says "gmux"', () => {
    const findings = scan();
    const report = findings
      .map((f) => `  ${f.where} (${f.kind})\n    «${f.text}»`)
      .join('\n');
    expect(
      findings,
      findings.length === 0
        ? ''
        : `User-visible text still says "gmux". Say "Tortie" instead — do NOT ` +
            `rename an identifier strand, and do not silence this by widening ` +
            `TECHNICAL unless the token really is an identifier:\n${report}`
    ).toEqual([]);
  });

  it('keeps the packaged identity on Tortie', () => {
    const pkg = JSON.parse(
      readFileSync(join(REPO, 'package.json'), 'utf8')
    ) as { productName?: string };
    expect(pkg.productName).toBe('Tortie');

    const builder = readFileSync(join(REPO, 'electron-builder.yml'), 'utf8');
    // Phase 27: Tortie ships under Itavero, the operator's LLC. The SpecStory
    // INTEGRATION keeps its name; the app's own vendor identity is Itavero.
    expect(builder).toMatch(/^appId:\s*com\.itavero\.tortie\s*$/m);
    expect(builder).toMatch(/^productName:\s*Tortie\s*$/m);
  });

  /**
   * The audit's own guardrail. If a later cleanup "finishes off" the rename,
   * this fails loudly and names the strand — which is the failure mode
   * CLAUDE.md calls out by name (risk 10 of the Phase 18 brief).
   */
  it('still binds live sessions to the protected identifier strands', () => {
    const read = (...p: string[]): string =>
      readFileSync(join(REPO, ...p), 'utf8');

    // The private socket: `tmux -L gmux`. Renaming this strands every running
    // session, which is why it is asserted rather than merely allow-listed.
    expect(read('src', 'main', 'tmux', 'supervisor.ts')).toMatch(
      /export const TMUX_SOCKET = 'gmux';/
    );
    expect(read('src', 'main', 'tmux', 'resolve.ts')).toContain(
      'gmux-tmux.conf'
    );
    expect(read('src', 'main', 'tmux', 'sessions.ts')).toContain('@gmux-id');
    expect(read('src', 'main', 'tmux', 'env.ts')).toContain('GMUX_SESSION_ID');
    expect(read('src', 'main', 'tmux', 'env.ts')).toContain('GMUX_MANAGED');
  });

  it('gives every allow-list entry a reason', () => {
    for (const entry of ALLOWED_FILES) {
      expect(entry.why.length, entry.file).toBeGreaterThan(40);
    }
    for (const entry of TECHNICAL) {
      expect(entry.why.length, String(entry.pattern)).toBeGreaterThan(10);
    }
  });
});
