/**
 * One call site, the way the worker would hand it over, from the callee text
 * alone. The split is the worker's own so a test written here reads a site
 * the way the product does.
 */

import type { ExtractedCall } from '../../../symbols/extract';
import type { GrammarId } from '../../../symbols/languages';
import { splitCallee } from '../../../symbols/calls';
import type { RuleContext } from '../types';

export function site(
  callee: string,
  args: (string | null)[] = [],
  extra: Partial<Pick<ExtractedCall, 'form' | 'line' | 'argc'>> = {}
): ExtractedCall {
  const { last, recv } = splitCallee(callee);
  return {
    callee,
    last,
    recv,
    args: args.map((a) => a ?? ''),
    argc: extra.argc ?? args.length,
    line: extra.line ?? 1,
    form: extra.form ?? 'call'
  };
}

export function ctx(file: string, lang: GrammarId, text = ''): RuleContext {
  const slash = file.lastIndexOf('/');
  return {
    file,
    lang,
    base: file.slice(slash + 1).toLowerCase(),
    dir: slash < 0 ? '' : file.slice(0, slash).toLowerCase(),
    text
  };
}
